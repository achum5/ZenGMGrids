
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AiChatPage() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResponse("");
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResponse(data.text);
    } catch (error) {
      console.error(error);
      setResponse("Failed to get response from AI.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>AI Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full gap-2">
              <Label htmlFor="prompt">Your Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Type your message here."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send"}
              </Button>
            </div>
          </form>
          {response && (
            <div className="mt-4">
              <Label>AI Response</Label>
              <div className="p-4 bg-muted rounded-md">
                <p>{response}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
