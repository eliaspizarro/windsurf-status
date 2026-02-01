import * as vscode from "vscode";
import https from "https";

const STATUS_URL = "https://status.windsurf.com/api/v2/status.json";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

let lastIndicator: string | null = null;

function fetchStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(STATUS_URL, res => {
            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on("error", reject);
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

        if (indicator !== "none" && indicator !== lastIndicator) {
            lastIndicator = indicator;

            vscode.window.showWarningMessage(
                `Windsurf status: ${description}`
            );
        }

        if (indicator === "none") {
            lastIndicator = null;
        }
    } catch {
        vscode.window.showErrorMessage(
            "Windsurf status check failed"
        );
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
