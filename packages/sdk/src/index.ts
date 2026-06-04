import type {
  RunIntentRequest,
  RunIntentResponse
} from "@rpa/shared-contracts";

export class RpaClient {
  constructor(private readonly baseUrl: string) {}

  async run(payload: RunIntentRequest): Promise<RunIntentResponse> {
    const response = await fetch(`${this.baseUrl}/run-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to run intent: ${response.status}`);
    }

    return (await response.json()) as RunIntentResponse;
  }
}

