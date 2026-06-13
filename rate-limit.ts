// hit-haiku-rpm.ts
// Run: ANTHROPIC_API_KEY=sk-ant-... npx tsx hit-haiku-rpm.ts

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) process.exit(1);

const MODEL = "claude-haiku-4-5-20251001";

// For Tier 1 1,000 RPM:
// 100 RPS should hit quickly even with token-bucket refill.
// Expected successful requests before 429: roughly ~1,100–1,300 if bucket starts full.
const RPS = Number(process.env.RPS ?? 100);
const MAX_REQUESTS = Number(process.env.MAX_REQUESTS ?? 1500);
const MAX_IN_FLIGHT = Number(process.env.MAX_IN_FLIGHT ?? 50);

const INTERVAL_MS = 1000 / RPS;

let started = 0;
let inFlight = 0;
let hitRateLimit = false;
const t0 = Date.now();
const controller = new AbortController();

async function sendOne(requestNumber: number) {
    if (hitRateLimit) return;
    inFlight++;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: controller.signal,
            headers: {
                "content-type": "application/json",
                "x-api-key": API_KEY!,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 1,
                messages: [{ role: "user", content: "." }],
            }),
        });

        if (res.status === 429 && !hitRateLimit) {
            hitRateLimit = true;

            const body = await res.text().catch(() => "");

            console.log(
                JSON.stringify(
                    {
                        event: "RATE_LIMIT_HIT",
                        status: res.status,
                        retry_after: res.headers.get("retry-after"),
                        requests_started: requestNumber,
                        elapsed_ms: Date.now() - t0,
                        request_limit: res.headers.get("anthropic-ratelimit-requests-limit"),
                        request_remaining: res.headers.get("anthropic-ratelimit-requests-remaining"),
                        request_reset: res.headers.get("anthropic-ratelimit-requests-reset"),
                        input_token_limit: res.headers.get("anthropic-ratelimit-input-tokens-limit"),
                        output_token_limit: res.headers.get("anthropic-ratelimit-output-tokens-limit"),
                        body,
                    },
                    null,
                    2
                )
            );

            controller.abort();
        }
    } catch {
        // No output unless rate limit is hit.
    } finally {
        inFlight--;
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    while (!hitRateLimit && started < MAX_REQUESTS) {
        while (!hitRateLimit && inFlight >= MAX_IN_FLIGHT) {
            await sleep(1);
        }

        started++;
        void sendOne(started);
        await sleep(INTERVAL_MS);
    }

    while (!hitRateLimit && inFlight > 0) {
        await sleep(10);
    }

    // Per your request, no console output if no rate limit was hit.
    if (!hitRateLimit) process.exitCode = 2;
}

main().catch(() => process.exit(1));