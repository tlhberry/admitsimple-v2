import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, TrendingUp, Handshake, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAIFeatures } from "@/hooks/use-ai";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export default function AiInsights() {
  const { getInsights, getReferralInsights, customQuery } = useAIFeatures();
  const [activeSection, setActiveSection] = useState("trends");
  const [customQuestion, setCustomQuestion] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});

  const handleGenerate = async (type: string) => {
    try {
      let res: any;
      if (type === "trends")   res = await getInsights.mutateAsync({ data: {} });
      if (type === "referrals") res = await getReferralInsights.mutateAsync({ data: {} });
      if (type === "custom") {
        if (!customQuestion) return;
        res = await customQuery.mutateAsync({ data: { question: customQuestion } });
      }
      if (res) setResults(prev => ({ ...prev, [type]: res.text }));
    } catch (e) { console.error(e); }
  };

  const isPending = getInsights.isPending || getReferralInsights.isPending || customQuery.isPending;

  const sections = [
    { id: "trends",   title: "Admissions Trends",   icon: TrendingUp,   desc: "Analyze volume, conversion rates, and capacity." },
    { id: "referrals",title: "Referral Analysis",    icon: Handshake,    desc: "Identify top performing sources and relationships." },
    { id: "custom",   title: "Ask Claude Anything",  icon: MessageSquare,desc: "Query your facility's data with natural language." },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/15 border border-primary/25 rounded-2xl flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          AI Intelligence Hub
        </h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
          Powered by Claude. Generate executive summaries, identify bottlenecks, and ask complex questions about your admissions data.
        </p>
      </div>

      {/* HIPAA notice */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          <strong className="text-primary">HIPAA Notice:</strong>{" "}
          <span className="text-muted-foreground">Data sent to Claude is aggregated and de-identified. We do not transmit PHI (names, SSNs) for these insights.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Section nav */}
        <div className="space-y-1.5">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "w-full text-left p-4 rounded-2xl transition-all border",
                activeSection === s.id
                  ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                  : "bg-card border-border hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2.5 mb-1">
                <s.icon className={cn("w-4 h-4", activeSection === s.id ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-semibold text-sm", activeSection === s.id ? "text-foreground" : "text-muted-foreground")}>{s.title}</span>
              </div>
              <p className="text-xs text-muted-foreground pl-6.5">{s.desc}</p>
            </button>
          ))}
        </div>

        {/* Main panel */}
        <Card className="md:col-span-3 rounded-2xl border-border overflow-hidden bg-card min-h-[500px] flex flex-col">
          <div className="p-5 border-b border-border bg-muted/40 flex justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-foreground">
              {sections.find(s => s.id === activeSection)?.title}
            </h2>
            {activeSection !== "custom" && (
              <Button
                onClick={() => handleGenerate(activeSection)}
                disabled={isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 px-5"
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Generate Insight
              </Button>
            )}
          </div>

          <CardContent className="p-0 flex-1 flex flex-col">
            {activeSection === "custom" && (
              <div className="p-5 border-b border-border bg-muted/20">
                <div className="flex gap-3">
                  <Textarea
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="e.g. Why did our conversion rate drop last week compared to the week before?"
                    className="resize-none h-14 min-h-[56px] rounded-xl border-border bg-muted text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                  <Button
                    onClick={() => handleGenerate("custom")}
                    disabled={isPending || !customQuestion}
                    className="h-14 px-5 rounded-xl"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
                  </Button>
                </div>
              </div>
            )}

            <div className="p-7 flex-1 overflow-y-auto">
              {isPending ? (
                <div className="flex flex-col items-center justify-center h-full text-primary py-20 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 animate-pulse" />
                    <Brain className="w-14 h-14 relative z-10 animate-bounce" />
                  </div>
                  <p className="font-semibold text-foreground text-lg">Claude is analyzing your data...</p>
                </div>
              ) : results[activeSection] ? (
                <div className="prose max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-code:text-primary">
                  <ReactMarkdown>{results[activeSection]}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                  <div className="w-18 h-18 bg-muted rounded-full flex items-center justify-center mb-4 border border-border p-5">
                    <Sparkles className="w-8 h-8 opacity-30" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">Ready to analyze</p>
                  <p className="text-sm mt-1 max-w-sm text-center">Click Generate to extract meaningful, data-driven insights tailored to your facility.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
