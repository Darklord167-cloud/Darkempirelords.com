import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message } = body;

              if (!process.env.OPENAI_API_KEY) {
                    return NextResponse.json({ message: "System error: OpenAI Key missing." }, { status: 500 });
                        }

                            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                                  method: "POST",
                                        headers: {
                                                "Content-Type": "application/json",
                                                        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                                                              },
                                                                    body: JSON.stringify({
                                                                            model: "gpt-4o",
                                                                                    messages: [
                                                                                              { role: "system", content: "You are the Dark Empire Oracle, an AI advisor representing Dark Empire Holdings. Speak formally, authoritatively, and with a confident, slightly cyberpunk corporate tone." },
                                                                                                        { role: "user", content: message }
                                                                                                                ]
                                                                                                                      })
                                                                                                                          });

                                                                                                                              if (!res.ok) {
                                                                                                                                    const errorData = await res.json();
                                                                                                                                          throw new Error(errorData.error?.message || "Failed to fetch from OpenAI");
                                                                                                                                              }

                                                                                                                                                  const completion = await res.json();
                                                                                                                                                      return NextResponse.json({ reply: completion.choices[0].message.content });
                                                                                                                                                        } catch (error: any) {
                                                                                                                                                            console.error("Oracle Error:", error);
                                                                                                                                                                return NextResponse.json({ message: "The Oracle is currently unreachable." }, { status: 500 });
                                                                                                                                                                  }
                                                                                                                                                                  }