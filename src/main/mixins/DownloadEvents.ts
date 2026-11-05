import PatreonDownloader, { isDenoInstalled } from "patreon-dl";
import { convertUIConfigToPatreonDLOptions } from "../Downloader";
import type { DownloaderBundle, MainProcessConstructor } from "../MainProcess";
import type { Editor } from "../types/App";
import ObjectHelper from "../util/ObjectHelper";
import { dialog, shell } from "electron";
import _ from "lodash";
import { getErrorString } from "../../common/util/Misc";
import { runCollectionQueue } from "../CollectionQueue";
import { setTimeout as delay } from "node:timers/promises";
import { encode } from "html-entities";
import type WebBrowserView from "../views/browser/WebBrowserView";
import { existsSync } from "node:fs";

export function DownloadEventSupportMixin<TBase extends MainProcessConstructor>(
  Base: TBase
) {
  return class DownloadEventSupportedProcess extends Base {
    #showDenoMissingWarning = true;
    #downloadDestinationPath: string | null = null;

    protected registerMainEventListeners() {
      const callbacks = super.registerMainEventListeners();
      return [
        ...callbacks,

        this.handle("startDownload", (editor: Editor) => {
          return new Promise<void>((resolve) => {
            (async () => {
              this.#downloadDestinationPath = null;
              this.on(
                "downloaderModalClose",
                () => {
                  this.win.hideModalView();
                  resolve();
                },
                { once: true }
              );
              this.win.showModalView();
              try {
                const {
                  targetURL,
                  bootstrapData,
                  downloaderOptions,
                  consoleLogger,
                  fileLogger,
                  prompt
                } = convertUIConfigToPatreonDLOptions(editor.config, {
                  userAgent: this.resolvedUserAgent
                });
                const collectionsURL = /^https:\/\/www\.patreon\.com\/(?:c\/|cw\/)?[^/]+\/collections\/?(?:[?#].*)?$/.test(targetURL);
                const browser = this.win.webBrowserView;
                const collectionsPage = collectionsURL ? browser?.collectionsPage : null;
                if (collectionsURL && (!collectionsPage || collectionsPage.url !== targetURL)) {
                  throw new Error("Open the creator collections page in the browser and wait for it to load.");
                }
                if (bootstrapData) {
                  console.debug(
                    "DownloadEvent: instantiating PatreonDownloader with bootstrapData:",
                    bootstrapData
                  );
                } else {
                  console.debug(
                    "DownloadEvent: bootstrapData not available - instantiating PatreonDownloader with targetURL:",
                    targetURL
                  );
                }
                this.downloader = {
                  instance: await PatreonDownloader.getInstance(
                    collectionsPage ? {
                      type: "post",
                      targetURL,
                      postFetch: { type: "byUser", campaignId: collectionsPage.campaignId, vanity: new URL(targetURL).pathname.split('/').filter(Boolean).at(-2)! }
                    } : bootstrapData || targetURL,
                    downloaderOptions
                  ),
                  consoleLogger,
                  abortController: new AbortController(),
                  status: "init"
                };
                const dlConfig = this.downloader.instance.getConfig();

                this.emitRendererEvent(this.win.modalView, "downloaderInit", {
                  hasError: false,
                  downloaderConfig: ObjectHelper.clean(
                    this.#getDisplayConfig(dlConfig),
                    {
                      deep: true,
                      cleanNulls: true,
                      cleanEmptyObjects: true
                    }
                  ),
                  fileLoggerConfig: fileLogger.getConfig(),
                  prompt
                });

                await this.#showDenoMissingWarningDialog(dlConfig);

                this.on(
                  "confirmStartDownload",
                  async (result) => {
                    if (result.confirmed) {
                      await this.#startDownloader(collectionsPage && browser ? { campaignId: collectionsPage.campaignId, browser, options: downloaderOptions, maxRetries: editor.config.request["max.retries"] } : undefined);
                    } else {
                      this.downloader = null;
                    }
                  },
                  { once: true }
                );
              } catch (error: unknown) {
                const errMsg = getErrorString(error);
                this.downloader = null;
                this.emitRendererEvent(this.win.modalView, "downloaderInit", {
                  hasError: true,
                  error: `Error: ${errMsg}`
                });
              }
            })();
          });
        }),

        this.handle("abortDownload", () => {
          if (!this.#checkDownloaderExists(this.downloader)) {
            return;
          }
          this.downloader.abortController.abort();
        }),

        this.handle("openDownloadFolder", async () => {
          const path = this.#downloadDestinationPath;
          if (path && existsSync(path)) {
            await shell.openPath(path);
          }
        })
      ];
    }

    #checkDownloaderExists(
      downloader: DownloaderBundle | null
    ): downloader is DownloaderBundle {
      if (!downloader) {
        dialog.showErrorBox("Error", "Downloader instance been destroyed.");
        return false;
      }
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    #getDisplayConfig(config: ReturnType<PatreonDownloader<any>["getConfig"]>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const displayConfig = _.cloneDeep(config) as any;
      displayConfig.minVideoDuration = config.minVideoDuration ?? 0;
      delete displayConfig.type;
      delete displayConfig.postFetch;
      delete displayConfig.productId;
      if (config.include?.postsPublished?.after) {
        displayConfig.include.postsPublished.after =
          config.include.postsPublished.after.toString();
      }
      if (config.include?.postsPublished?.before) {
        displayConfig.include.postsPublished.before =
          config.include.postsPublished.before.toString();
      }
      if (config.include?.productsPublished?.after) {
        displayConfig.include.productsPublished.after =
          config.include.productsPublished.after.toString();
      }
      if (config.include?.productsPublished?.before) {
        displayConfig.include.productsPublished.before =
          config.include.productsPublished.before.toString();
      }
      if (config.include?.mediaByFilename) {
        for (const [k, v] of Object.entries(config.include.mediaByFilename)) {
          if (v) {
            if (v.startsWith("!")) {
              const stripped = v.substring(1);
              if (!stripped) {
                delete displayConfig.include.mediaByFilename[k];
              } else {
                displayConfig.include.mediaByFilename[k] = {
                  pattern: v.substring(1),
                  "case-sensitive": false
                };
              }
            } else {
              displayConfig.include.mediaByFilename[k] = {
                pattern: v,
                "case-sensitive": true
              };
            }
          }
        }
      }
      return displayConfig;
    }

    async #showDenoMissingWarningDialog(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: ReturnType<PatreonDownloader<any>["getConfig"]>
    ) {
      if (!this.#showDenoMissingWarning) {
        return;
      }
      const ytExternalDownloader =
        config.embedDownloaders &&
        config.embedDownloaders.find(
          (downloader) => downloader.provider === "YouTube" && downloader.exec
        );
      if (
        !ytExternalDownloader &&
        !isDenoInstalled(config.pathToDeno || undefined).installed
      ) {
        const result = await dialog.showMessageBox(this.win, {
          type: "warning",
          buttons: ["Got it"],
          checkboxLabel: "Do not show me again for the rest of this session",
          defaultId: 0,
          title: "Warning",
          message: `Deno not found`,
          detail:
            'Deno (https://deno.com) is not found on this system. For embedded YouTube videos, the downloader needs to run code obtained from YouTube / Google servers. Without Deno, such code will be executed without sandboxing. Running un-sandboxed code exposes your system to potential security vulnerabilities, including unauthorized access, data corruption, or malicious operations. If you do have Deno installed, you may specify its path manually in the "Other" tab. Otherwise, procceed at your own discretion.'
        });
        if (result.checkboxChecked) {
          this.#showDenoMissingWarning = false;
        }
      }
    }

    async #startDownloader(collections?: {
      campaignId: string;
      browser: WebBrowserView;
      options: Parameters<typeof PatreonDownloader.getInstance>[1];
      maxRetries: number;
    }) {
      if (!this.#checkDownloaderExists(this.downloader)) {
        return;
      }
      try {
        this.downloader.consoleLogger.on("message", (message) => {
          this.emitRendererEvent(
            this.win.modalView,
            "downloaderLogMessage",
            message
          );
        });
        this.downloader.status = "running";
        this.emitRendererEvent(this.win.modalView, "downloaderStart");
        const bundle = this.downloader;
        bundle.instance.on("campaignDir", ({ path }: { path: string }) => {
          this.#downloadDestinationPath = path;
        });
        const signal = bundle.abortController.signal;
        if (collections) {
          const log = (text: string, level: "info" | "error" = "info") =>
            this.emitRendererEvent(this.win.modalView, "downloaderLogMessage", { text: encode(text), level });
          const makeURL = (show: boolean) => {
            const url = new URL("https://www.patreon.com/api/collection");
            url.searchParams.set("filter[campaign_id]", collections.campaignId);
            url.searchParams.set("filter[must_contain_at_least_one_published_post]", "true");
            url.searchParams.set("fields[collection]", "title,collection_id");
            url.searchParams.set("json-api-version", "1.0");
            url.searchParams.set("json-api-use-default-includes", "false");
            if (show) url.searchParams.set("filter[collection_type]", "show");
            else url.searchParams.set("sort", "-edited_at");
            return url.toString();
          };
          const failures: string[] = [];
          log("Discovering creator collections...");
          await runCollectionQueue({
            starts: [makeURL(false), makeURL(true)],
            reverseDownloadOrder: collections.options?.include?.postsSortOrder === "oldest",
            signal,
            wait: () => delay(2000, undefined, { signal }),
            fetchPage: async (url) => {
              const parsed = new URL(url);
              if (parsed.origin !== "https://www.patreon.com" || parsed.pathname !== "/api/collection") throw new Error("Invalid collection pagination URL");
              let response: Response | undefined;
              for (let attempt = 0; attempt <= collections.maxRetries; attempt++) {
                response = await collections.browser.webContents.session.fetch(url, { signal, credentials: "include" });
                if (response.status !== 429 || attempt === collections.maxRetries) break;
                const retry = response.headers.get("retry-after");
                const seconds = retry ? Number(retry) : NaN;
                const millis = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
                await delay(Math.max(2000, millis || 0), undefined, { signal });
              }
              if (!response?.ok) throw new Error(`Collection discovery failed (HTTP ${response?.status ?? "unknown"})`);
              const json = await response.json() as { data?: { id?: unknown }[]; links?: { next?: unknown } };
              if (!Array.isArray(json.data) || json.data.some(item => typeof item.id !== "string" || !/^\d+$/.test(item.id))) throw new Error("Invalid collection list response");
              if (json.links?.next != null && typeof json.links.next !== "string") throw new Error("Invalid collection pagination link");
              log(`Discovered ${json.data.length} collections in this page.`);
              return { ids: json.data.map(item => item.id as string), next: json.links?.next as string | null ?? null };
            },
            download: async (id, index, total) => {
              log(`Downloading collection ${index + 1} of ${total}: #${id}`);
              bundle.instance = await PatreonDownloader.getInstance(`https://www.patreon.com/collection/${id}`, collections.options);
              bundle.instance.on("campaignDir", ({ path }: { path: string }) => {
                this.#downloadDestinationPath = path;
              });
              await bundle.instance.start({ signal });
            },
            onFailure: (id, error) => { failures.push(id); log(`Collection #${id} failed: ${getErrorString(error)}`, "error"); },
            isFatal: error => /\b(401|403)\b/.test(getErrorString(error))
          });
          if (failures.length) throw new Error(`Failed collections: ${failures.join(", ")}`);
          log("Collection queue complete.");
        } else {
          await bundle.instance.start({ signal });
        }
        this.downloader.status = "end";
        if (this.downloader.abortController.signal.aborted) {
          this.emitRendererEvent(this.win.modalView, "downloaderEnd", {
            hasError: false,
            aborted: true
          });
          return;
        }
        this.emitRendererEvent(this.win.modalView, "downloaderEnd", {
          hasError: false,
          aborted: false
        });
      } catch (error: unknown) {
        this.downloader.status = "end";
        if (this.downloader.abortController.signal.aborted) {
          this.emitRendererEvent(this.win.modalView, "downloaderEnd", { hasError: false, aborted: true });
        } else {
          this.emitRendererEvent(this.win.modalView, "downloaderEnd", { hasError: true, error: getErrorString(error) });
        }
      } finally {
        this.downloader.consoleLogger.removeAllListeners();
        this.downloader = null;
      }
    }
  };
}
