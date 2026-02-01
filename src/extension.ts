import * as vscode from "vscode";
import https from "https";

const STATUS_URL = "https://status.windsurf.com/api/v2/status.json";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let lastIndicator: string | null = null;
let lastError: boolean = false;

function fetchStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
        const req = https.get(STATUS_URL, { timeout: 10000 }, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch {
                    reject(new Error("Invalid JSON response"));
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        req.on("error", reject);
    });
}

async function checkStatus() {
    try {
        const data = await fetchStatus();

        const indicator = data.status?.indicator;
        const description = data.status?.description;

        if (!indicator) {
            return;
        }

        if (lastError) {
            lastError = false;

            vscode.window.showInformationMessage(
                "Windsurf status service reachable again"
            );
        }

        if (indicator === "none") {
            lastIndicator = null;
            return;
        }

        if (indicator !== lastIndicator) {
            lastIndicator = indicator;

            vscode.window.showWarningMessage(
                `Windsurf status: ${description}`
            );
        }

    } catch {
        if (!lastError) {
            lastError = true;

            vscode.window.showErrorMessage(
                "Unable to reach Windsurf status service"
            );
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    checkStatus();

    const timer = setInterval(checkStatus, CHECK_INTERVAL_MS);

    context.subscriptions.push({
        dispose: () => clearInterval(timer)
    });
}

export function deactivate() {}
