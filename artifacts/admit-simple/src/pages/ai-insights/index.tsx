import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, TrendingUp, Handshake, GitBranch, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAIFeatures } from "@/hooks/use-ai";
import ReactMarkdown from "react-markdown";

export default function AiInsights() {
  const { getInsights, getReferralInsights, customQuery } = useAIFeatures();
  
  const [activeSection, setActiveSection] = useState("trends");
  const [customQuestion, setCustomQuestion] = useState("");
  
  const [results, setResults] = useState<Record<string, string>>({});

  const handleGenerate = async (type: string) => {
    try {
      let res;
      if (type === 'trends') {
        res = await getInsights.mutateAsync({ data: {} });
      } else if (type === 'referrals') {
        res = await getReferralInsights.mutateAsync({ data: {} });
      } else if (type === 'custom') {
        if (!customQuestion) return;
        res = await customQuery.mutateAsync({ data: { question: customQuestion } });
      }
      
      if (res) {
        setResults(prev => ({ ...prev, [type]: res.text }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isPending = getInsights.isPending || getReferralInsights.isPending || customQuery.isPending;

  const sections = [
    { id: "trends", title: "Admissions Trends", icon: TrendingUp, desc: "Analyze volume, conversion rates, and capacity." },
    { id: "referrals", title: "Referral Analysis", icon: Handshake, desc: "Identify top performing sources and relationships." },
    { id: "custom", title: "Ask Claude Anything", icon: MessageSquare, desc: "Query your facility's data with natural language." }
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          AI Intelligence Hub
        </h1>
        <p className="text-slate-500 mt-2 max-w-2xl">
          Powered by Claude. Generate executive summaries, identify bottlenecks, and ask complex questions about your admissions data.
        </p>
      </div>

      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-8 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-900">
          <strong>HIPAA Notice:</strong> Data sent to Anthropic's Claude AI is aggregated and de-identified. We do not transmit PHI (Protected Health Information) such as names or SSNs for these insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${
                activeSection === s.id 
                  ? 'bg-white border-indigo-200 shadow-md ring-1 ring-indigo-500/10 relative z-10' 
                  : 'bg-transparent border-transparent hover:bg-white/50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <s.icon className={`w-5 h-5 ${activeSection === s.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className={`font-semibold ${activeSection === s.id ? 'text-indigo-900' : 'text-slate-700'}`}>{s.title}</span>
              </div>
              <p className="text-xs text-slate-500 pl-8">{s.desc}</p>
            </button>
          ))}
        </div>

        <Card className="md:col-span-3 rounded-2xl shadow-lg border-0 ring-1 ring-slate-200 overflow-hidden bg-white min-h-[500px] flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
              {sections.find(s => s.id === activeSection)?.title}
            </h2>
            {activeSection !== 'custom' && (
              <Button 
                onClick={() => handleGenerate(activeSection)}
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md h-10 px-6"
              >
                {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                Generate Insight
              </Button>
            )}
          </div>
          
          <CardContent className="p-0 flex-1 flex flex-col">
            {activeSection === 'custom' && (
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex gap-3">
                  <Textarea 
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="e.g. Why did our conversion rate drop last week compared to the week before?"
                    className="resize-none h-14 min-h-[56px] rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-indigo-200"
                  />
                  <Button 
                    onClick={() => handleGenerate('custom')}
                    disabled={isPending || !customQuestion}
                    className="h-14 px-6 bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                  >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ask"}
                  </Button>
                </div>
              </div>
            )}

            <div className="p-8 flex-1 overflow-y-auto">
              {isPending ? (
                <div className="flex flex-col items-center justify-center h-full text-indigo-400 py-20 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <Brain className="w-16 h-16 relative z-10 animate-bounce" />
                  </div>
                  <p className="font-medium text-indigo-900">Claude is analyzing your data...</p>
                </div>
              ) : results[activeSection] ? (
                <div className="prose prose-slate prose-headings:text-indigo-900 prose-a:text-indigo-600 max-w-none">
                  <ReactMarkdown>{results[activeSection]}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-lg font-medium text-slate-600">Ready to analyze</p>
                  <p className="text-sm mt-1 max-w-sm text-center">Click generate to extract meaningful, data-driven insights tailored to your facility's performance.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
