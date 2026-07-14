import type { RequestHandler } from "express";

let nextJobId = 1843;
const jobs = [
  { id: 1842, targets: "*.acme-platform.com", scan_types: ["fingerprint", "crawl", "cve"], status: "running", progress: 68, created_at: new Date().toISOString() },
  { id: 1841, targets: "api.studio.dev", scan_types: ["fingerprint", "cve"], status: "completed", progress: 100, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
];

export const listScanJobs: RequestHandler = (_req, res) => res.json(jobs);

export const importTargets: RequestHandler = (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  const domains = [...new Set(content.split(/\r?\n/).map((line: string) => line.trim().toLowerCase()).filter(Boolean))];
  res.json({ domains, count: domains.length });
};

export const startScan: RequestHandler = (req, res) => {
  const targets = typeof req.body?.targets === "string" ? req.body.targets.trim() : "";
  const scanTypes = Array.isArray(req.body?.scanTypes) ? req.body.scanTypes.filter((type: unknown): type is string => typeof type === "string") : [];
  if (!targets || !scanTypes.length) return res.status(400).json({ error: "Targets and at least one scan module are required" });
  const job = { id: nextJobId++, targets, scan_types: scanTypes, status: "queued", progress: 0, created_at: new Date().toISOString() };
  jobs.unshift(job);
  return res.status(202).json({ jobId: job.id, targets: targets.split(/\r?\n/).filter(Boolean), types: scanTypes });
};
