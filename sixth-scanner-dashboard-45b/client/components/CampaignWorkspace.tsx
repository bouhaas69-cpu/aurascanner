import { ChangeEvent, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, FileText, Mail, MessageCircle, Send, Sparkles, Upload, Users } from "lucide-react";

const steps = ["Audience", "Content", "Review", "Launch"];
const sendProviders = [
  { id: "ses", name: "AWS SES", sender: "Aura Operations", email: "updates@example.test", status: "CONNECTED", tone: "tag-amber" },
  { id: "sendgrid", name: "SendGrid", sender: "Product Updates", email: "news@example.test", status: "CONNECTED", tone: "tag-pink" },
  { id: "brevo", name: "Brevo", sender: "Aura News", email: "hello@example.test", status: "READY", tone: "tag-green" },
];

type AiMode = "subject" | "inbox";
const extractContacts = (text: string) => Array.from(new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || []));

export function CampaignWorkspace() {
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState("Q3 product update");
  const [subject, setSubject] = useState("A clearer way to plan your next launch");
  const [preheader, setPreheader] = useState("A quick look at what’s new for your next release.");
  const [message, setMessage] = useState("Hi there,\n\nWe’ve made it easier to keep your launch on track. Explore what’s new, bring your team together, and move from idea to publish with confidence.\n\nThanks,\nAura Operations");
  const [contacts, setContacts] = useState("alex@example.test\njamie@example.test\npat@example.test");
  const [providerId, setProviderId] = useState(sendProviders[0].id);
  const [notice, setNotice] = useState("");
  const [aiLoading, setAiLoading] = useState<AiMode | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: "assistant", content: "Je peux vous aider à améliorer le subject, le preheader ou la lecture inbox de cette newsletter." }]);
  const [saved, setSaved] = useState(false);
  const [launched, setLaunched] = useState(false);

  const recipients = useMemo(() => extractContacts(contacts), [contacts]);
  const provider = sendProviders.find((item) => item.id === providerId) || sendProviders[0];

  function importContacts(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const importedContacts = extractContacts(text);
      setContacts(importedContacts.join("\n"));
      setNotice(`${file.name} importé. ${importedContacts.length} contact(s) détecté(s).`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  async function askDeepSeek(mode: AiMode) {
    setAiLoading(mode);
    setNotice("");
    try {
      const response = await fetch("/api/ai/campaign", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("s6") || ""}` }, body: JSON.stringify({ mode, subject, preheader, message }) });
      const data = await response.json() as { subject?: string; preheader?: string; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "DeepSeek indisponible.");
      if (data.subject) setSubject(data.subject);
      if (data.preheader) setPreheader(data.preheader);
      if (mode === "inbox" && data.message) setMessage(data.message);
      setNotice(mode === "subject" ? "DeepSeek a proposé un sujet et un preheader." : "DeepSeek a optimisé le contenu pour la lecture inbox.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "DeepSeek indisponible.");
    } finally {
      setAiLoading(null);
    }
  }

  async function sendChatMessage() {
    const question = chatInput.trim();
    if (!question || chatLoading) return;
    setChatInput("");
    setChatMessages((current) => [...current, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const response = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("s6") || ""}` }, body: JSON.stringify({ message: question, context: { subject, preheader, message } }) });
      const data = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "DeepSeek indisponible.");
      setChatMessages((current) => [...current, { role: "assistant", content: data.answer || "Je n’ai pas de suggestion pour le moment." }]);
    } catch (error) {
      setChatMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "DeepSeek indisponible." }]);
    } finally {
      setChatLoading(false);
    }
  }

  function saveDraft() {
    setSaved(true);
    setLaunched(false);
    setNotice("Brouillon enregistré dans cette session.");
  }

  function launchPreview() {
    setLaunched(true);
    setSaved(true);
    setStep(3);
    setNotice("Aperçu lancé. Aucun e-mail n’a été envoyé.");
  }

  return (
    <section className="page-shell campaign-page">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="eyebrow">OUTREACH WORKSPACE</p><h2 className="m-0 text-4xl font-semibold tracking-tight">Campaigns</h2><p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Composez, importez vos contacts, choisissez votre provider et contrôlez chaque aperçu avant diffusion.</p></div><span className="local-only-badge"><Check size={13} />Mode sécurisé · preview local</span></header>

      <div className="mb-7 grid gap-2 sm:grid-cols-4" aria-label="Campaign progress">{steps.map((label, index) => <button type="button" key={label} onClick={() => setStep(index)} aria-current={index === step ? "step" : undefined} className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${index === step ? "border-[var(--indigo)] bg-[var(--indigo-soft)]" : "border-[var(--line)] bg-[rgba(16,32,57,.55)] hover:border-[var(--line-strong)]"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${index < step ? "bg-[var(--mint)] text-[var(--ink)]" : index === step ? "bg-[var(--indigo)] text-white" : "bg-[var(--soft)] text-[var(--muted)]"}`}>{index < step ? <Check size={13} /> : index + 1}</span><span className="text-xs font-bold text-[var(--text)]">{label}</span></button>)}</div>

      {notice && <div className={`module-notice ${notice.toLowerCase().includes("indisponible") || notice.toLowerCase().includes("invalid") ? "border-[rgba(239,139,133,.3)] text-[var(--coral)]" : ""}`}><Check size={14} />{notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]"><div className="panel grid gap-5"><div className="panel-heading"><div><p className="eyebrow">STEP {String(step + 1).padStart(2, "0")} / {steps[step].toUpperCase()}</p><h3>{step === 0 ? "Préparer l’audience" : step === 1 ? "Composer la newsletter" : step === 2 ? "Review avant lancement" : "Aperçu de lancement"}</h3></div><Mail size={18} className="panel-accent" /></div>

        {step === 0 && <><p className="form-note">Importez un fichier CSV ou TXT, puis vérifiez les contacts avant de continuer.</p><label className="field"><span className="field-label">Nom de campagne</span><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} /></label><div className="import-drop"><Upload size={20} /><div><strong>Importer des contacts</strong><span>CSV ou TXT · les adresses restent dans cette session</span></div><label className="btn-secondary">Choisir un fichier<input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={importContacts} /></label></div><label className="field"><span className="field-label">Contacts</span><textarea value={contacts} onChange={(event) => setContacts(event.target.value)} placeholder="name@example.com" /></label><div className="flex items-center gap-2 rounded-lg border border-[rgba(104,215,170,.22)] bg-[rgba(104,215,170,.07)] px-3 py-2 text-xs text-[var(--mint)]"><Users size={14} />{recipients.length} contact{recipients.length === 1 ? "" : "s"} détecté{recipients.length === 1 ? "" : "s"}</div></>}

        {step === 1 && <><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">DEEPSEEK ASSIST</p><p className="form-note">L’IA propose, vous gardez le contrôle avant toute sauvegarde.</p></div><button type="button" className="btn-secondary" onClick={() => askDeepSeek("subject")} disabled={aiLoading !== null}><Sparkles size={14} />{aiLoading === "subject" ? "Analyse…" : "Aider sur le sujet"}</button></div><label className="field"><span className="field-label">Subject line</span><input value={subject} onChange={(event) => setSubject(event.target.value)} /></label><label className="field"><span className="field-label">Preheader inbox</span><input value={preheader} onChange={(event) => setPreheader(event.target.value)} /></label><label className="field"><span className="field-label">Message</span><textarea className="min-h-56" value={message} onChange={(event) => setMessage(event.target.value)} /></label><button type="button" className="btn-secondary w-fit" onClick={() => askDeepSeek("inbox")} disabled={aiLoading !== null}><Sparkles size={14} />{aiLoading === "inbox" ? "Optimisation inbox…" : "Aider à optimiser l’inbox"}</button></>}

        {step === 2 && <div className="grid gap-5"><div><p className="eyebrow">SEND PROVIDER</p><p className="form-note">Choisissez un provider déjà enregistré dans votre panel opérateur.</p><div className="mt-3 grid gap-2">{sendProviders.map((item) => <button type="button" key={item.id} onClick={() => setProviderId(item.id)} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${providerId === item.id ? "border-[var(--indigo)] bg-[var(--indigo-soft)]" : "border-[var(--line)] bg-[rgba(7,19,34,.45)] hover:border-[var(--line-strong)]"}`}><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--soft)] text-[var(--indigo)]"><Mail size={14} /></span><span className="min-w-0 flex-1"><strong className="block text-xs text-[var(--text)]">{item.name}</strong><small className="block truncate text-[10px] text-[var(--quiet)]">{item.sender} · {item.email}</small></span><span className={`tag ${item.tone}`}>{item.status}</span>{providerId === item.id && <Check size={15} className="text-[var(--mint)]" />}</button>)}</div></div><div className="rounded-xl border border-[var(--line)] bg-[rgba(7,19,34,.58)] p-4"><p className="eyebrow">DELIVERY CHECKLIST</p><div className="grid gap-2 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><Check size={14} className="text-[var(--mint)]" />{recipients.length} contact(s) loaded</span><span className="flex items-center gap-2"><Check size={14} className="text-[var(--mint)]" />Provider sélectionné : {provider.name}</span><span className="flex items-center gap-2"><Check size={14} className="text-[var(--mint)]" />Envoi externe désactivé pour la preview</span></div></div></div>}

        {step === 3 && <div className="grid place-items-center gap-3 rounded-xl border border-dashed border-[rgba(124,108,255,.6)] bg-[var(--indigo-soft)] px-6 py-12 text-center"><span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--indigo)] text-white"><Send size={20} /></span><h4 className="m-0 text-lg">{launched ? "Preview prête" : "Prête à lancer"}</h4><p className="m-0 max-w-sm text-xs text-[var(--muted)]">{provider.name} est sélectionné, mais aucun email ne sera envoyé depuis cette interface.</p></div>}

        <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-5"><button type="button" className="btn-secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ChevronLeft size={15} />Retour</button><div className="flex flex-wrap gap-2"><button type="button" className="btn-secondary" onClick={saveDraft}><FileText size={14} />Save draft</button>{step < 2 ? <button type="button" className="btn-primary" onClick={() => setStep((current) => current + 1)}>Continuer<ChevronRight size={15} /></button> : step === 2 ? <button type="button" className="btn-primary" onClick={launchPreview}><Eye size={14} />Lancer la preview</button> : <button type="button" className="btn-primary" onClick={() => setStep(0)}>Nouvelle campagne</button>}</div></div></div>

        {step === 1 ? <aside className="panel flex h-fit min-h-[470px] flex-col gap-4"><div className="panel-heading"><div><p className="eyebrow">DEEPSEEK CHAT</p><h3>Parler à votre assistant</h3></div><MessageCircle size={18} className="panel-accent" /></div><div className="grid max-h-80 gap-3 overflow-y-auto pr-1">{chatMessages.map((item, index) => <div key={`${item.role}-${index}`} className={`rounded-xl p-3 text-xs leading-5 ${item.role === "user" ? "ml-8 bg-[var(--indigo-soft)] text-[var(--text)]" : "mr-4 border border-[var(--line)] bg-[rgba(7,19,34,.55)] text-[var(--muted)]"}`}><strong className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--quiet)]">{item.role === "user" ? "Vous" : "DeepSeek"}</strong>{item.content}</div>)}</div><form className="mt-auto flex gap-2" onSubmit={(event) => { event.preventDefault(); void sendChatMessage(); }}><input className="min-w-0 flex-1" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ex. rends le subject plus direct…" disabled={chatLoading} /><button type="submit" className="btn-primary px-3" disabled={chatLoading || !chatInput.trim()}><Send size={14} /></button></form><p className="form-note">L’assistant conseille uniquement : aucune action ni aucun envoi n’est déclenché.</p></aside> : step === 2 ? <aside className="panel h-fit"><div className="panel-heading"><div><p className="eyebrow">LIVE PREVIEW · {provider.name}</p><h3>Inbox card</h3></div><Eye size={18} className="panel-accent" /></div><div className="rounded-xl border border-[var(--line)] bg-[#f6f7fb] p-4 text-[#162033] shadow-inner"><div className="mb-4 flex items-center gap-3 border-b border-[#dde1ea] pb-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e5e0ff] text-xs font-bold text-[#5847bb]">AO</span><div><strong className="block text-xs">{provider.sender}</strong><span className="text-[10px] text-[#6a7282]">{provider.email}</span></div></div><p className="mb-1 text-[10px] text-[#6a7282]">{preheader}</p><h4 className="mb-4 text-base leading-snug">{subject || "Your campaign subject"}</h4><p className="whitespace-pre-line text-xs leading-6 text-[#4b5565]">{message}</p></div><p className="mt-4 text-xs text-[var(--quiet)]">Audience : <strong className="text-[var(--text)]">{recipients.length} contacts</strong></p></aside> : <aside className="panel h-fit"><div className="panel-heading"><div><p className="eyebrow">CAMPAIGN CONTEXT</p><h3>Assistant ready</h3></div><Sparkles size={18} className="panel-accent" /></div><p className="form-note">Passez à Content pour discuter avec DeepSeek, puis à Review pour contrôler la carte inbox.</p><div className="safe-callout">{provider.name} · {recipients.length} contacts</div></aside>}</div>
    </section>
  );
}
