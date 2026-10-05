"use client";

import { useMemo, useState } from "react";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import Sidebar from "../components/Sidebar";

const API_URL = "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

type FileInfo = {
  path: string;
  size?: number;
  sha?: string;
  type?: string;
};

type Relationship = {
  source: string;
  target: string;
  type: string;
  label: string;
};

type Analysis = {
  file_count: number;
  project_type: string;
  languages: Record<string, number>;
  entry_points: string[];
  important_files: {
    path: string;
    reason: string;
    score: number;
  }[];
  summary: string;
};

type Repository = {
  url: string;
  owner: string;
  name: string;
  default_branch: string;
  description?: string | null;
  language?: string | null;
  stars: number;
  forks: number;
};

type AnalyzeResponse = {
  repository: Repository;
  analysis: Analysis;
  content_files_loaded: number;
  analyzed_files: FileInfo[];
  relationships: Relationship[];
  relationship_count: number;
};

type ComplexityItem = {
  path: string;
  lines_of_code: number;
  functions: number;
  classes: number;
  imports: number;
  branches: number;
  complexity_score: number;
  hotspot: string;
  reason: string;
};

type ComplexityResponse = {
  repository: Repository;
  files_analyzed: number;
  high_hotspots: number;
  medium_hotspots: number;
  low_hotspots: number;
  hotspots: ComplexityItem[];
};

type SetupResponse = {
  repository: Repository;
  setup_steps: string[];
  technologies: string[];
  evidence_files: string[];
  environment_files: string[];
  entry_points: string[];
  evidence_based: boolean;
};

type FirstTaskResponse = {
  repository: Repository;
  task: string;
  reason: string;
  source: string;
  evidence_type: string;
};

type AskEvidence = {
  path: string;
  score: number;
  snippet: string;
  line_start: number;
  line_end: number;
};

type AskResponse = {
  answer: string;
  confidence: string;
  keywords_used: string[];
  evidence: AskEvidence[];
};

type TabName =
  | "Overview"
  | "Architecture"
  | "Setup"
  | "Ask"
  | "First Task";

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight text-white">
        {value}
      </p>

      {detail && (
        <p className="mt-2 text-xs text-slate-500">
          {detail}
        </p>
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0d1424]">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-sm font-semibold text-white">
          {title}
        </h3>

        {subtitle && (
          <p className="mt-1 text-xs text-slate-600">
            {subtitle}
          </p>
        )}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

function EmptyPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-2xl text-cyan-300">
          ✦
        </div>

        <h2 className="mt-5 text-xl font-semibold text-white">
          {title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   ARCHITECTURE GRAPH
========================================================= */

function ArchitectureGraph({
  files,
  projectType,
  relationships,
}: {
  files: FileInfo[];
  projectType: string;
  relationships: Relationship[];
}) {
  const graph = useMemo(() => {
    const limitedFiles = files.slice(0, 30);

    const groups = new Map<string, FileInfo[]>();

    limitedFiles.forEach((file) => {
      const parts = file.path
        .split("/")
        .filter(Boolean);

      let groupName = "Project";

      if (parts.length > 1) {
        groupName = parts[0];
      }

      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }

      groups.get(groupName)?.push(file);
    });

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    /* -----------------------------------------------------
       REPOSITORY NODE
    ----------------------------------------------------- */

    nodes.push({
      id: "repository",
      position: {
        x: 480,
        y: 40,
      },
      data: {
        label: (
          <div className="min-w-[180px]">
            <div className="text-[9px] font-bold uppercase tracking-widest text-cyan-300">
              Repository
            </div>

            <div className="mt-2 text-sm font-bold text-white">
              CodeSensei Target
            </div>

            <div className="mt-1 text-[10px] text-slate-500">
              {projectType}
            </div>
          </div>
        ),
      },
      style: {
        background: "#0d2637",
        border: "1px solid rgba(34,211,238,0.35)",
        borderRadius: 16,
        padding: 14,
        color: "white",
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.25)",
      },
    });

    /* -----------------------------------------------------
       DIRECTORY + FILE NODES
    ----------------------------------------------------- */

    let groupIndex = 0;

    groups.forEach((groupFiles, groupName) => {
      const groupId = `group:${groupName}`;

      const groupX =
        80 + (groupIndex % 3) * 330;

      const groupY =
        190 +
        Math.floor(groupIndex / 3) * 300;

      nodes.push({
        id: groupId,
        position: {
          x: groupX,
          y: groupY,
        },
        data: {
          label: (
            <div className="min-w-[180px]">
              <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">
                Module / Directory
              </div>

              <div className="mt-2 text-sm font-bold text-white">
                {groupName}
              </div>

              <div className="mt-1 text-[10px] text-slate-500">
                {groupFiles.length} files
              </div>
            </div>
          ),
        },
        style: {
          background: "#0b211d",
          border:
            "1px solid rgba(52,211,153,0.35)",
          borderRadius: 16,
          padding: 14,
          color: "white",
        },
      });

      edges.push({
        id: `repository-${groupId}`,
        source: "repository",
        target: groupId,
        type: "smoothstep",
        style: {
          stroke: "rgba(34,211,238,0.35)",
          strokeWidth: 1.2,
        },
      });

      groupFiles.forEach((file, fileIndex) => {
        const fileId = `file:${file.path}`;

        const fileX =
          groupX +
          (fileIndex % 2) * 155;

        const fileY =
          groupY +
          100 +
          Math.floor(fileIndex / 2) * 95;

        nodes.push({
          id: fileId,
          position: {
            x: fileX,
            y: fileY,
          },
          data: {
            label: (
              <div className="w-[135px]">
                <div className="truncate text-xs font-semibold text-white">
                  {file.path.split("/").pop()}
                </div>

                <div className="mt-1 truncate text-[9px] text-slate-600">
                  {file.path}
                </div>
              </div>
            ),
          },
          style: {
            background: "#111a2c",
            border:
              "1px solid rgba(148,163,184,0.16)",
            borderRadius: 12,
            padding: 10,
            color: "white",
          },
        });

        edges.push({
          id: `${groupId}-${fileId}`,
          source: groupId,
          target: fileId,
          type: "smoothstep",
          style: {
            stroke:
              "rgba(148,163,184,0.22)",
            strokeWidth: 1,
          },
        });
      });

      groupIndex += 1;
    });

    /* -----------------------------------------------------
       REAL IMPORT / DEPENDENCY RELATIONSHIPS
    ----------------------------------------------------- */

    const knownFileIds = new Set(
      limitedFiles.map(
        (file) => `file:${file.path}`
      )
    );

    relationships.forEach(
      (relationship, relationshipIndex) => {
        const sourceId =
          `file:${relationship.source}`;

        const targetId =
          `file:${relationship.target}`;

        if (!knownFileIds.has(sourceId)) {
          return;
        }

        if (!knownFileIds.has(targetId)) {
          return;
        }

        edges.push({
          id: `relationship-${relationshipIndex}-${relationship.source}-${relationship.target}`,
          source: sourceId,
          target: targetId,
          type: "smoothstep",
          label:
            relationship.label ||
            "imports",
          animated: true,
          style: {
            stroke: "#22d3ee",
            strokeWidth: 2,
            strokeDasharray: "6 4",
          },
          labelStyle: {
            fill: "#67e8f9",
            fontSize: 9,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "#07111f",
            fillOpacity: 0.9,
          },
        });
      }
    );

    return {
      nodes,
      edges,
    };
  }, [files, projectType, relationships]);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-b-2xl">
      <ReactFlow
        nodes={graph.nodes}
        edges={graph.edges}
        fitView
        fitViewOptions={{
          padding: 0.2,
          minZoom: 0.35,
          maxZoom: 1,
        }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        zoomOnScroll
        panOnScroll
        attributionPosition="bottom-left"
        className="h-full w-full bg-[#080d18]"
      >
        <Background
          gap={16}
          size={1}
        />

        <Controls />

        <MiniMap
          pannable
          zoomable
          className="!bg-white"
        />
      </ReactFlow>
    </div>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function Home() {
  const [activeTab, setActiveTab] =
    useState<TabName>("Overview");

  const [repositoryUrl, setRepositoryUrl] =
    useState(
      "https://github.com/purvisingh27/codesensei"
    );

  const [repository, setRepository] =
    useState<Repository | null>(null);

  const [analysis, setAnalysis] =
    useState<Analysis | null>(null);

  const [analyzedFiles, setAnalyzedFiles] =
    useState<FileInfo[]>([]);

  const [relationships, setRelationships] =
    useState<Relationship[]>([]);

  const [complexity, setComplexity] =
    useState<ComplexityResponse | null>(
      null
    );

  const [setup, setSetup] =
    useState<SetupResponse | null>(null);

  const [firstTask, setFirstTask] =
    useState<FirstTaskResponse | null>(null);

  const [question, setQuestion] =
    useState("");

  const [askResult, setAskResult] =
    useState<AskResponse | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [askLoading, setAskLoading] =
    useState(false);

  /* =======================================================
     ANALYZE REPOSITORY
  ======================================================= */

  async function analyzeRepository() {
    if (!repositoryUrl.trim()) {
      setError(
        "Please enter a GitHub repository URL."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      /* -----------------------------------------------
         BASIC REPOSITORY ANALYSIS
      ------------------------------------------------ */

      const analyzeResponse =
        await fetch(`${API_URL}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: repositoryUrl.trim(),
          }),
        });

      if (!analyzeResponse.ok) {
        const body =
          await analyzeResponse
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            `Analysis failed with status ${analyzeResponse.status}`
        );
      }

      const analyzeData =
        (await analyzeResponse.json()) as AnalyzeResponse;

      setRepository(
        analyzeData.repository
      );

      setAnalysis(
        analyzeData.analysis
      );

      setAnalyzedFiles(
        analyzeData.analyzed_files || []
      );

      setRelationships(
        analyzeData.relationships || []
      );

      /* -----------------------------------------------
         COMPLEXITY ANALYSIS
      ------------------------------------------------ */

      try {
        const complexityResponse =
          await fetch(
            `${API_URL}/complexity`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                url: repositoryUrl.trim(),
              }),
            }
          );

        if (complexityResponse.ok) {
          const complexityData =
            (await complexityResponse.json()) as ComplexityResponse;

          setComplexity(
            complexityData
          );
        }
      } catch {
        setComplexity(null);
      }

      /* -----------------------------------------------
         SETUP
      ------------------------------------------------ */

      try {
        const setupResponse =
          await fetch(`${API_URL}/setup`, {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              url: repositoryUrl.trim(),
            }),
          });

        if (setupResponse.ok) {
          const setupData =
            (await setupResponse.json()) as SetupResponse;

          setSetup(setupData);
        }
      } catch {
        setSetup(null);
      }

      /* -----------------------------------------------
         FIRST TASK
      ------------------------------------------------ */

      try {
        const taskResponse =
          await fetch(
            `${API_URL}/first-task`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                url: repositoryUrl.trim(),
              }),
            }
          );

        if (taskResponse.ok) {
          const taskData =
            (await taskResponse.json()) as FirstTaskResponse;

          setFirstTask(taskData);
        }
      } catch {
        setFirstTask(null);
      }

      setActiveTab("Overview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch repository analysis."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     ASK REPOSITORY
  ======================================================= */

  async function askQuestion() {
    if (!repositoryUrl.trim()) {
      setError(
        "Please enter a GitHub repository URL first."
      );
      return;
    }

    if (!question.trim()) {
      return;
    }

    setAskLoading(true);
    setError("");

    try {
      const response =
        await fetch(`${API_URL}/ask`, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            url: repositoryUrl.trim(),
            question: question.trim(),
          }),
        });

      if (!response.ok) {
        const body =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          body?.detail ||
            `Question failed with status ${response.status}`
        );
      }

      const data =
        (await response.json()) as AskResponse;

      setAskResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to ask the repository."
      );
    } finally {
      setAskLoading(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) =>
          setActiveTab(tab as TabName)
        }
      />

      <main className="ml-64 min-h-screen">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b14]/90 backdrop-blur-xl">
          <div className="flex min-h-[88px] items-center justify-between gap-6 px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                Repository Intelligence
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
                {activeTab}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

                <span className="text-[10px] font-medium text-emerald-300">
                  FastAPI Connected
                </span>
              </div>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] text-slate-600">
                IBM Bob 2.0
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="space-y-6 p-8">
          {/* Repository input */}

          <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="flex-1">
                <input
                  value={repositoryUrl}
                  onChange={(event) =>
                    setRepositoryUrl(
                      event.target.value
                    )
                  }
                  placeholder="Paste a GitHub repository URL..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#080d18] px-4 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/40"
                />
              </div>

              <button
                onClick={analyzeRepository}
                disabled={loading}
                className="h-12 rounded-xl bg-cyan-400 px-6 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Analyzing..."
                  : "Analyze Repository"}
              </button>
            </div>
          </div>

          {/* Error */}

          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* =================================================
              OVERVIEW
          ================================================= */}

          {activeTab === "Overview" && (
            <>
              {!analysis ? (
                <EmptyPage
                  title="Analyze a repository"
                  description="Paste a public GitHub repository above and CodeSensei will inspect its actual file tree, project signals, setup evidence, code relationships, and complexity hotspots."
                />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                      label="Files analyzed"
                      value={
                        analysis.file_count
                      }
                      detail="Repository evidence"
                    />

                    <Metric
                      label="Project type"
                      value={
                        analysis.project_type
                      }
                      detail="Detected from project files"
                    />

                    <Metric
                      label="Languages"
                      value={
                        Object.keys(
                          analysis.languages
                        ).length
                      }
                      detail="Recognized file types"
                    />

                    <Metric
                      label="Relationships"
                      value={
                        relationships.length
                      }
                      detail="Detected imports"
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel
                      title="Language distribution"
                      subtitle="Detected from the actual repository file tree."
                    >
                      <div className="space-y-4">
                        {Object.entries(
                          analysis.languages
                        ).map(
                          (
                            [language, count]
                          ) => {
                            const total =
                              Math.max(
                                analysis.file_count,
                                1
                              );

                            const percentage =
                              Math.round(
                                (count /
                                  total) *
                                  100
                              );

                            return (
                              <div
                                key={
                                  language
                                }
                              >
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-300">
                                    {language}
                                  </span>

                                  <span className="text-slate-600">
                                    {count} files
                                  </span>
                                </div>

                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                                  <div
                                    className="h-full rounded-full bg-cyan-400"
                                    style={{
                                      width: `${Math.max(
                                        percentage,
                                        4
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </Panel>

                    <Panel
                      title="Architecture intelligence"
                      subtitle="Evidence collected from repository structure and relationships."
                    >
                      <div className="space-y-3">
                        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600">
                            Summary
                          </p>

                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {analysis.summary}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-white/[0.03] p-4">
                            <p className="text-xs text-slate-600">
                              Entry points
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {
                                analysis
                                  .entry_points
                                  .length
                              }
                            </p>
                          </div>

                          <div className="rounded-xl bg-white/[0.03] p-4">
                            <p className="text-xs text-slate-600">
                              Imports
                            </p>

                            <p className="mt-2 text-xl font-bold text-white">
                              {
                                relationships.length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </div>

                  {/* =================================================
                      COMPLEXITY & HOTSPOTS
                  ================================================= */}

                  {complexity && (
                    <Panel
                      title="Code complexity & hotspots"
                      subtitle="Static analysis identifies files that may deserve extra developer attention."
                    >
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-red-400/10 bg-red-400/[0.03] p-4">
                          <p className="text-[10px] uppercase tracking-widest text-red-300">
                            High hotspots
                          </p>

                          <p className="mt-3 text-3xl font-bold text-white">
                            {
                              complexity.high_hotspots
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-600">
                            Files with higher structural complexity
                          </p>
                        </div>

                        <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.03] p-4">
                          <p className="text-[10px] uppercase tracking-widest text-amber-300">
                            Medium hotspots
                          </p>

                          <p className="mt-3 text-3xl font-bold text-white">
                            {
                              complexity.medium_hotspots
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-600">
                            Files worth reviewing
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
                          <p className="text-[10px] uppercase tracking-widest text-emerald-300">
                            Low hotspots
                          </p>

                          <p className="mt-3 text-3xl font-bold text-white">
                            {
                              complexity.low_hotspots
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-600">
                            Relatively simple files
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {complexity.hotspots
                          .slice(0, 8)
                          .map((item) => (
                            <div
                              key={item.path}
                              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {item.path}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-600">
                                    {item.reason}
                                  </p>
                                </div>

                                <span
                                  className={`w-fit rounded-full px-3 py-1 text-[10px] font-semibold ${
                                    item.hotspot ===
                                    "High"
                                      ? "bg-red-400/10 text-red-300"
                                      : item.hotspot ===
                                        "Medium"
                                      ? "bg-amber-400/10 text-amber-300"
                                      : "bg-emerald-400/10 text-emerald-300"
                                  }`}
                                >
                                  {
                                    item.hotspot
                                  }{" "}
                                  ·{" "}
                                  {
                                    item.complexity_score
                                  }
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                                <div className="rounded-lg bg-white/[0.03] p-3">
                                  <p className="text-[9px] text-slate-600">
                                    Lines
                                  </p>

                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      item.lines_of_code
                                    }
                                  </p>
                                </div>

                                <div className="rounded-lg bg-white/[0.03] p-3">
                                  <p className="text-[9px] text-slate-600">
                                    Functions
                                  </p>

                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      item.functions
                                    }
                                  </p>
                                </div>

                                <div className="rounded-lg bg-white/[0.03] p-3">
                                  <p className="text-[9px] text-slate-600">
                                    Classes
                                  </p>

                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      item.classes
                                    }
                                  </p>
                                </div>

                                <div className="rounded-lg bg-white/[0.03] p-3">
                                  <p className="text-[9px] text-slate-600">
                                    Imports
                                  </p>

                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      item.imports
                                    }
                                  </p>
                                </div>

                                <div className="rounded-lg bg-white/[0.03] p-3">
                                  <p className="text-[9px] text-slate-600">
                                    Branches
                                  </p>

                                  <p className="mt-1 text-sm text-slate-300">
                                    {
                                      item.branches
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </Panel>
                  )}

                  {/* =================================================
                      PIPELINE
                  ================================================= */}

                  <Panel
                    title="Analysis pipeline"
                    subtitle="What CodeSensei currently does with the repository."
                  >
                    <div className="grid gap-3 md:grid-cols-4">
                      {[
                        [
                          "01",
                          "Ingest",
                          "Load GitHub repository tree and text files.",
                        ],
                        [
                          "02",
                          "Understand",
                          "Detect languages, project signals and entry points.",
                        ],
                        [
                          "03",
                          "Connect",
                          "Resolve internal imports and dependencies.",
                        ],
                        [
                          "04",
                          "Guide",
                          "Generate setup, Q&A, complexity and first-task signals.",
                        ],
                      ].map(
                        ([number, title, text]) => (
                          <div
                            key={number}
                            className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
                          >
                            <div className="text-[10px] font-bold text-cyan-400">
                              {number}
                            </div>

                            <div className="mt-2 text-sm font-semibold text-white">
                              {title}
                            </div>

                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              {text}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </Panel>

                  {/* =================================================
                      IMPORTANT FILES + FIRST TASK
                  ================================================= */}

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel
                      title="Important files"
                      subtitle="Files that provide strong project structure signals."
                    >
                      <div className="space-y-2">
                        {analysis.important_files
                          .slice(0, 8)
                          .map((file) => (
                            <div
                              key={file.path}
                              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3"
                            >
                              <div>
                                <p className="text-xs font-medium text-slate-300">
                                  {file.path}
                                </p>

                                <p className="mt-1 text-[10px] text-slate-600">
                                  {file.reason}
                                </p>
                              </div>

                              <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-300">
                                {file.score}
                              </span>
                            </div>
                          ))}
                      </div>
                    </Panel>

                    <Panel
                      title="Next contribution"
                      subtitle="Evidence-based first-task recommendation."
                    >
                      {firstTask ? (
                        <div>
                          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-cyan-400">
                              Recommended task
                            </p>

                            <p className="mt-3 text-sm font-semibold leading-6 text-white">
                              {
                                firstTask.task
                              }
                            </p>

                            <p className="mt-3 text-xs leading-5 text-slate-500">
                              {
                                firstTask.reason
                              }
                            </p>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-slate-500">
                              {
                                firstTask.source
                              }
                            </span>

                            <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-slate-500">
                              {
                                firstTask.evidence_type
                              }
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No first-task recommendation loaded yet.
                        </p>
                      )}
                    </Panel>
                  </div>
                </>
              )}
            </>
          )}

          {/* =================================================
              ARCHITECTURE
          ================================================= */}

          {activeTab === "Architecture" && (
            <>
              {!analysis ? (
                <EmptyPage
                  title="Architecture map is waiting"
                  description="Analyze a GitHub repository first. CodeSensei will then build a graph from the actual repository files and detected internal dependencies."
                />
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                      Architecture Intelligence
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-white">
                      Interactive architecture map
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                      This graph is generated from the actual files loaded from the GitHub repository. Directories become module nodes, repository files become evidence nodes, and detected imports become dependency connections.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1424]">
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
                      <div>
                        <p className="text-xs font-semibold text-white">
                          Interactive repository graph
                        </p>

                        <p className="mt-1 text-[10px] text-slate-600">
                          Drag nodes • scroll to zoom • use controls to navigate
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] text-cyan-300">
                          {
                            analyzedFiles.length
                          }{" "}
                          nodes
                        </span>

                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-[10px] text-emerald-300">
                          {
                            relationships.length
                          }{" "}
                          dependencies
                        </span>
                      </div>
                    </div>

                    <ArchitectureGraph
                      files={analyzedFiles}
                      projectType={
                        analysis.project_type
                      }
                      relationships={
                        relationships
                      }
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel
                      title="Entry points"
                      subtitle="Potential application entry points detected from repository files."
                    >
                      {analysis.entry_points
                        .length > 0 ? (
                        <div className="space-y-2">
                          {analysis.entry_points.map(
                            (entry) => (
                              <div
                                key={entry}
                                className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-medium text-cyan-300"
                              >
                                {entry}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No conventional entry point detected.
                        </p>
                      )}
                    </Panel>

                    <Panel
                      title="Detected technologies"
                      subtitle="Languages and project signals identified from the repository."
                    >
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(
                          analysis.languages
                        ).map(
                          ([language, count]) => (
                            <span
                              key={language}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300"
                            >
                              {language} ·{" "}
                              {count}
                            </span>
                          )
                        )}
                      </div>
                    </Panel>
                  </div>

                  <Panel
                    title="Detected dependencies"
                    subtitle="These connections come from source-code import statements resolved against repository files."
                  >
                    {relationships.length ===
                    0 ? (
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                        <p className="text-sm text-slate-400">
                          No internal file-to-file imports were detected in the loaded repository files.
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          This can be normal for repositories containing mainly documentation, HTML, configuration files, or files whose dependencies are external packages.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {relationships
                          .slice(0, 20)
                          .map(
                            (
                              relationship,
                              index
                            ) => (
                              <div
                                key={`${relationship.source}-${relationship.target}-${index}`}
                                className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-4"
                              >
                                <p className="truncate text-xs font-medium text-slate-300">
                                  {
                                    relationship.source
                                  }
                                </p>

                                <div className="my-2 text-[10px] text-cyan-400">
                                  ↓{" "}
                                  {
                                    relationship.label
                                  }{" "}
                                  ↓
                                </div>

                                <p className="truncate text-xs font-medium text-slate-300">
                                  {
                                    relationship.target
                                  }
                                </p>
                              </div>
                            )
                          )}
                      </div>
                    )}
                  </Panel>
                </>
              )}
            </>
          )}

          {/* =================================================
              SETUP
          ================================================= */}

          {activeTab === "Setup" && (
            <>
              {!setup ? (
                <EmptyPage
                  title="Setup analysis is waiting"
                  description="Analyze a repository to detect its actual setup files, technologies, environment configuration and likely onboarding steps."
                />
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                      Developer Onboarding
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-white">
                      Repository setup
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      Evidence-based setup information detected from the repository.
                    </p>
                  </div>

                  <Panel
                    title="Setup steps"
                    subtitle="Generated from files and configuration actually found in the repository."
                  >
                    <div className="space-y-3">
                      {setup.setup_steps.map(
                        (step, index) => (
                          <div
                            key={`${step}-${index}`}
                            className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xs font-bold text-cyan-300">
                              {index + 1}
                            </div>

                            <p className="pt-1 text-sm leading-6 text-slate-300">
                              {step}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </Panel>

                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel
                      title="Technologies"
                      subtitle="Detected project technologies."
                    >
                      <div className="flex flex-wrap gap-2">
                        {setup.technologies.map(
                          (technology) => (
                            <span
                              key={technology}
                              className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-300"
                            >
                              {technology}
                            </span>
                          )
                        )}
                      </div>
                    </Panel>

                    <Panel
                      title="Evidence files"
                      subtitle="Files used to build the setup understanding."
                    >
                      <div className="space-y-2">
                        {setup.evidence_files.map(
                          (file) => (
                            <div
                              key={file}
                              className="rounded-xl bg-white/[0.03] px-4 py-3 text-xs text-slate-400"
                            >
                              {file}
                            </div>
                          )
                        )}
                      </div>
                    </Panel>
                  </div>
                </>
              )}
            </>
          )}

          {/* =================================================
              ASK
          ================================================= */}

          {activeTab === "Ask" && (
            <>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                  Repository Q&A
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white">
                  Ask CodeSensei
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ask questions about the loaded repository. Answers are grounded in matching repository files.
                </p>
              </div>

              <Panel
                title="Repository question"
                subtitle="Examples: Where is the frontend defined? Where is configuration handled? Which files contain testing code?"
              >
                <div className="flex flex-col gap-3">
                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(
                        event.target.value
                      )
                    }
                    placeholder="Ask something about this repository..."
                    rows={4}
                    className="w-full resize-none rounded-xl border border-white/10 bg-[#080d18] p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-700 focus:border-cyan-400/40"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={askQuestion}
                      disabled={askLoading}
                      className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {askLoading
                        ? "Searching..."
                        : "Ask Repository"}
                    </button>
                  </div>
                </div>
              </Panel>

              {askResult && (
                <>
                  <Panel
                    title="Answer"
                    subtitle={`Confidence: ${askResult.confidence}`}
                  >
                    <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.03] p-5">
                      <p className="text-sm leading-7 text-slate-300">
                        {askResult.answer}
                      </p>
                    </div>

                    {askResult.keywords_used
                      .length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {askResult.keywords_used.map(
                          (keyword) => (
                            <span
                              key={keyword}
                              className="rounded-full bg-white/5 px-3 py-1 text-[10px] text-slate-500"
                            >
                              {keyword}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </Panel>

                  <Panel
                    title="Repository evidence"
                    subtitle="Matching file sections used to support the answer."
                  >
                    <div className="space-y-4">
                      {askResult.evidence.map(
                        (item) => (
                          <div
                            key={`${item.path}-${item.line_start}`}
                            className="overflow-hidden rounded-xl border border-white/5 bg-[#080d18]"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                              <span className="text-xs font-medium text-cyan-300">
                                {item.path}
                              </span>

                              <span className="text-[10px] text-slate-600">
                                lines{" "}
                                {
                                  item.line_start
                                }
                                –
                                {
                                  item.line_end
                                }
                              </span>
                            </div>

                            <pre className="overflow-x-auto p-4 text-[11px] leading-5 text-slate-500">
                              {item.snippet}
                            </pre>
                          </div>
                        )
                      )}
                    </div>
                  </Panel>
                </>
              )}
            </>
          )}

          {/* =================================================
              FIRST TASK
          ================================================= */}

          {activeTab === "First Task" && (
            <>
              {!firstTask ? (
                <EmptyPage
                  title="First contribution is waiting"
                  description="Analyze a repository to identify an evidence-based first task for a new contributor."
                />
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
                      Contribution Intelligence
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-white">
                      Best first task
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      CodeSensei prioritizes repository evidence and real GitHub issues when available.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-7">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                      Recommended contribution
                    </p>

                    <h3 className="mt-4 max-w-3xl text-2xl font-bold leading-9 text-white">
                      {firstTask.task}
                    </h3>

                    <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-400">
                      {firstTask.reason}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                        Source:{" "}
                        {firstTask.source}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                        Evidence:{" "}
                        {
                          firstTask.evidence_type
                        }
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}