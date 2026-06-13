import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    console.error("Please configure it in your .env file or export it in your environment.");
    process.exit(1);
  }

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

  console.log("\n2. Creating environment...");
  const environment = await client.beta.environments.create({
    name: "quickstart-env",
    config: {
      type: "cloud",
      networking: { type: "unrestricted" },
    },
  });
  console.log(`✓ Environment created! ID: ${environment.id}`);

  console.log("\n3. Starting session...");
  const session = await client.beta.sessions.create({
    agent: agent.id,
    environment_id: environment.id,
    title: "Quickstart session",
  });
  console.log(`✓ Session started! ID: ${session.id}`);

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
    } else if (event.type === "session.status_idle") {
      console.log("\n\nAgent finished.");
      break;
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Unhandled error during execution:", err);
  process.exit(1);
});
