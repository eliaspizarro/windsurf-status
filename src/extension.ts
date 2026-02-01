import * as vscode from "vscode";
import https from "https";

const STATUS_URL = "https://status.windsurf.com/api/v2/status.json";
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

// null = estado desconocido (inicio)
// true = caído
// false = operativo
let lastDownState: boolean | null = null;

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
                    reject(new Error("Invalid JSON"));
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

        const indicator: string | undefined = data.status?.indicator;

        if (!indicator) {
            return;
        }

        const isDown = indicator !== "none";

        // Primer chequeo: solo guardamos estado, NO notificamos
        if (lastDownState === null) {
            lastDownState = isDown;
            return;
        }

        // Transición: OK → CAÍDO
        if (!lastDownState && isDown) {
            lastDownState = true;

            vscode.window.showErrorMessage(
                "Windsurf service is DOWN"
            );
            return;
        }

        // Transición: CAÍDO → OK
        if (lastDownState && !isDown) {
            lastDownState = false;

            vscode.window.showInformationMessage(
                "Windsurf service is OPERATIONAL again"
            );
            return;
        }

        // Sin cambios → no hacer nada

    } catch {
        // Si no se puede consultar la API, lo tratamos como CAÍDO
        if (lastDownState === false) {
            lastDownState = true;

            vscode.window.showErrorMessage(
                "Windsurf status service unreachable (assuming DOWN)"
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
