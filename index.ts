import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { PostHog } from "posthog-node";

const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST,
  flushAt: 1,
  flushInterval: 0,
  enableExceptionAutocapture: true,
});

const distinctId = process.env.USER || process.env.USERNAME || "unknown_user";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    console.error("Please configure it in your .env file or export it in your environment.");
    process.exit(1);
  }

  posthog.identify({
    distinctId,
    properties: {
      $set: { username: distinctId },
    },
  });

  // Initialize the Anthropic client (will automatically use ANTHROPIC_API_KEY)
  const client = new Anthropic({
    apiKey: apiKey,
  });

  console.log("1. Creating agent...");
  const agent = await client.beta.agents.create({
    name: "Coding Assistant",
    model: "claude-opus-4-8",
    system: "You are a helpful coding assistant. Write clean, well-documented code.",
    tools: [
      { type: "agent_toolset_20260401" },
    ],
  });
  console.log(`✓ Agent created! ID: ${agent.id}, version: ${agent.version}`);
  posthog.capture({
    distinctId,
    event: "agent created",
    properties: {
      agent_id: agent.id,
      agent_name: agent.name,
      agent_model: agent.model,
      agent_version: agent.version,
    },
  });

  console.log("\n2. Creating environment...");
  const environment = await client.beta.environments.create({
    name: "quickstart-env",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  });
  console.log(`✓ Environment created! ID: ${environment.id}`);
  posthog.capture({
    distinctId,
    event: "environment created",
    properties: {
      environment_id: environment.id,
      environment_name: environment.name,
      environment_type: "cloud",
    },
  });

  console.log("\n3. Starting session...");
  const session = await client.beta.sessions.create({
    agent: agent.id,
    environment_id: environment.id,
    title: "Quickstart session",
  });
  console.log(`✓ Session started! ID: ${session.id}`);
  posthog.capture({
    distinctId,
    event: "session started",
    properties: {
      session_id: session.id,
      agent_id: agent.id,
      environment_id: environment.id,
    },
  });

  console.log("\n4. Opening event stream and sending initial message...");
  const stream = await client.beta.sessions.events.stream(session.id);

  // Send the user message after the stream opens
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [
          {
            type: "text",
            text: "Create a Python script that generates the first 20 Fibonacci numbers and saves them to fibonacci.txt. Then send it to my email at aznmke1@gmail.com",
          },
        ],
      },
    ],
  });
  posthog.capture({
    distinctId,
    event: "message sent",
    properties: {
      session_id: session.id,
      agent_id: agent.id,
    },
  });

  console.log("\n--- Streaming Response ---");
  // Process streaming events
  for await (const event of stream) {
    if (event.type === "agent.message") {
      for (const block of event.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
    } else if (event.type === "agent.tool_use") {
      console.log(`\n[Using tool: ${event.name}]`);
      posthog.capture({
        distinctId,
        event: "agent tool used",
        properties: {
          session_id: session.id,
          agent_id: agent.id,
          tool_name: event.name,
        },
      });
    } else if (event.type === "session.status_idle") {
      console.log("\n\nAgent finished.");
      posthog.capture({
        distinctId,
        event: "session completed",
        properties: {
          session_id: session.id,
          agent_id: agent.id,
        },
      });
      break;
    }
  }
}

main()
  .catch((err) => {
    console.error("\n❌ Unhandled error during execution:", err);
    posthog.captureException(err, distinctId);
  })
  .finally(async () => {
    await posthog.shutdown();
  });
