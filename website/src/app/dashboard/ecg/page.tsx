"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Heart,
  Activity,
  Settings,
  Bell,
  FileText,
  Phone,
  Zap,
  Thermometer,
  Wind,
  Brain,
  AlertTriangle,
} from "lucide-react";
import {
  useAllPatients,
  useLatestECGPerPatient,
  Patient,
  calculateBpmStatus,
  usePatientDemoVitals,
  useAllAlerts,
  useMonitorStatus,
} from "@/lib/firebase-hooks";
import MonitorToggle from "@/components/MonitorToggle";
import DiagnosticReportsList from "@/components/DiagnosticReportsList";
import LiveECGChart from "@/components/LiveECGChart";
import { Shield } from "lucide-react";
import PatientECGCard from "@/components/PatientECGCard";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

// ─── Generate realistic BPM history data ──────────────────────────
function generateHistoryData(
  range: "1H" | "24H" | "7D" | "30D",
  baseBpm: number,
) {
  const now = Date.now();
  const configs = {
    "1H": { points: 60, intervalMs: 60_000, fmt: "HH:mm" }, // 1 point per minute
    "24H": { points: 96, intervalMs: 900_000, fmt: "HH:mm" }, // 1 point per 15 min
    "7D": { points: 84, intervalMs: 7_200_000, fmt: "EEE HH:mm" }, // 1 point per 2 hours
    "30D": { points: 90, intervalMs: 28_800_000, fmt: "MMM dd" }, // 1 point per 8 hours
  };
  const { points, intervalMs, fmt } = configs[range];
  const data: { timestamp: number; bpm: number; label: string }[] = [];

  let currentBpm = baseBpm;
  // Seed from the baseBpm so it's deterministic-ish per patient
  let seed = baseBpm * 1000 + range.charCodeAt(0);
  const pseudoRand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed % 1000) / 1000;
  };

  for (let i = 0; i < points; i++) {
    const ts = now - (points - 1 - i) * intervalMs;
    // Realistic diurnal pattern: lower at night (0-6am), higher during day
    const hour = new Date(ts).getHours();
    const diurnal =
      hour >= 0 && hour < 6
        ? -8
        : hour >= 6 && hour < 10
          ? -2
          : hour >= 22
            ? -5
            : 0;

    // Random walk with mean-reversion
    const drift = (pseudoRand() - 0.5) * 4;
    const meanRevert = (baseBpm - currentBpm) * 0.1;
    currentBpm = Math.round(
      Math.max(
        52,
        Math.min(105, currentBpm + drift + meanRevert + diurnal * 0.05),
      ),
    );

    data.push({
      timestamp: ts,
      bpm: currentBpm,
      label: format(new Date(ts), fmt),
    });
  }
  return data;
}

export default function ECGMonitorPage() {
  const { data: patients, loading: pLoading } = useAllPatients();
  const patientIds = patients.map((p) => p.userId as string);
  const { data: ecgMap, loading: eLoading } =
    useLatestECGPerPatient(patientIds);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [ecgTimeRange, setEcgTimeRange] = useState<
    "LIVE" | "1H" | "24H" | "7D" | "30D"
  >("LIVE");

  const selectedPatient = patients.find((p) => p.userId === selectedPatientId);
  const selectedEcgData = selectedPatientId
    ? ecgMap.get(selectedPatientId) || []
    : [];
  const vitals = usePatientDemoVitals(selectedPatientId || "");
  const { data: allAlerts } = useAllAlerts(30);
  const { disabled: selectedMonitorOff, isCalculating: selectedIsCalculating } = useMonitorStatus(selectedPatientId || "");

  // Filter alerts for the selected patient
  const patientAlerts = selectedPatientId
    ? allAlerts.filter((a) => a.userId === selectedPatientId)
    : [];

  const handleSaveSettings = async (updates: Partial<Patient>) => {
    if (!selectedPatientId) return;
    try {
      await update(ref(db, `users/${selectedPatientId}`), updates);
      toast.success("Settings updated");
    } catch (err) {
      toast.error("Failed to update settings");
    }
  };

  // Filter patients and sort by most recent ECG activity
  const filteredPatients = patients
    .filter((p) => {
      if (
        search &&
        !(p.name ?? "").toLowerCase().includes(search.toLowerCase())
      )
        return false;

      // Status filter
      if (statusFilter !== "all") {
        const pEcg = ecgMap.get(p.userId || "") || [];
        const bpm = pEcg.length > 0 ? pEcg[pEcg.length - 1].bpm : 0;
        const stat = calculateBpmStatus(bpm);
        if (statusFilter !== stat) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by most recent ECG data first
      const aEcg = ecgMap.get(a.userId || "") || [];
      const bEcg = ecgMap.get(b.userId || "") || [];
      const aTime = aEcg.length > 0 ? aEcg[aEcg.length - 1].timestamp : 0;
      const bTime = bEcg.length > 0 ? bEcg[bEcg.length - 1].timestamp : 0;
      return bTime - aTime;
    });

  return (
    <div className="space-y-6 relative h-full">
      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#1C2B1E] border border-[rgba(212,184,150,0.15)] rounded-full px-6 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <div className="flex items-center space-x-3 w-full sm:w-1/2 relative">
          <Search className="h-5 w-5 text-[#9BA897] absolute left-3" />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#111811] text-[#F0E6D3] placeholder-[#5C6B58] border border-[#2A3D2E] focus:border-[#D4B896] rounded-full pl-10 pr-4 py-2 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111811] text-[#D4B896] border border-[#2A3D2E] rounded-full px-4 py-2 outline-none focus:border-[#D4B896] appearance-none"
          >
            <option value="all">All Status</option>
            <option value="normal">Normal</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>

          <div className="bg-[#D4B896] text-[#141A14] font-poppins font-semibold px-4 py-2 rounded-full text-sm">
            Showing {filteredPatients.length}
          </div>
        </div>
      </div>

      {/* PATIENT GRID */}
      {pLoading || eLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 shimmer rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((p) => (
            <PatientECGCard
              key={p.userId}
              patient={p}
              ecgData={ecgMap.get(p.userId || "") || []}
              onClick={() => setSelectedPatientId(p.userId || null)}
              monitorDisabled={p.monitorDisabled}
            />
          ))}
          {filteredPatients.length === 0 && (
            <div className="col-span-full py-20 text-center text-[#7A8A76] font-inter">
              No patients match your filters.
            </div>
          )}
        </div>
      )}

      {/* SIDE PANEL MODAL */}
      <AnimatePresence>
        {selectedPatientId && selectedPatient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatientId(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-2xl bg-[#141A14] border-l border-[rgba(212,184,150,0.15)] shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-[rgba(212,184,150,0.1)] flex justify-between items-center bg-[#1A2620]">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-[rgba(212,184,150,0.1)] text-[#D4B896] font-poppins font-bold text-xl flex items-center justify-center">
                    {(selectedPatient.name ?? "")
                      .split(" ")
                      .map((w) => w[0] || "")
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "U"}
                  </div>
                  <div>
                    <h2 className="font-poppins font-semibold text-2xl text-[#F0E6D3] tracking-tight">
                      {selectedPatient?.name ?? "Unknown"}
                    </h2>
                    <p className="text-[#9BA897]">
                      Patient ID: {selectedPatient?.userId ?? "N/A"}
                    </p>
                    <p className="text-[#9BA897]">
                      {selectedPatient?.phone ?? "No phone"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MonitorToggle
                    userId={selectedPatientId}
                    patientName={selectedPatient?.name || 'Patient'}
                    isDisabled={selectedMonitorOff}
                    isOffline={selectedPatient?.isOffline}
                    compact
                  />
                  <button
                    onClick={() => setSelectedPatientId(null)}
                    className="p-2 hover:bg-[rgba(212,184,150,0.1)] rounded-full text-[#D4B896] transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs.Root
                  defaultValue="overview"
                  className="flex flex-col h-full"
                >
                  <Tabs.List className="flex border-b border-[rgba(212,184,150,0.1)] px-6 bg-[#1A2620]">
                    {[
                      "Overview",
                      "ECG History",
                      "Alerts",
                      "Settings",
                      "Notes",
                    ].map((tab) => (
                      <Tabs.Trigger
                        key={tab.toLowerCase()}
                        value={tab.toLowerCase()}
                        className="px-4 py-3 text-[#9BA897] hover:text-[#D4B896] data-[state=active]:text-[#D4B896] font-medium outline-none border-b-2 border-transparent data-[state=active]:border-[#D4B896] transition-colors"
                      >
                        {tab}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <div className="flex-1 overflow-y-auto p-6 bg-[#141A14]">
                    <Tabs.Content
                      value="overview"
                      className="space-y-6 outline-none"
                    >
                      {/* BPM + Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="card-style p-4">
                          <div className="flex items-center space-x-2 text-[#9BA897] mb-2">
                            <Heart className="w-4 h-4" />{" "}
                            <span>Current BPM</span>
                          </div>
                          <div className="font-mono-data text-4xl text-[#F0E6D3]">
                            {selectedIsCalculating
                              ? "..."
                              : selectedMonitorOff
                                ? "0"
                                : selectedEcgData.length > 0
                                  ? selectedEcgData[selectedEcgData.length - 1].bpm
                                  : "--"}
                          </div>
                        </div>
                        <div className="card-style p-4">
                          <div className="flex items-center space-x-2 text-[#9BA897] mb-2">
                            <Activity className="w-4 h-4" /> <span>Status</span>
                          </div>
                          <div className={`font-poppins font-semibold text-xl uppercase ${selectedIsCalculating ? 'text-[#D4B896]' : selectedMonitorOff ? 'text-[#E05252]' : 'text-[#4CAF78]'}`}>
                            {selectedIsCalculating
                              ? "CALCULATING..."
                              : selectedMonitorOff
                                ? "DISABLED"
                                : calculateBpmStatus(
                                    selectedEcgData.length > 0
                                      ? selectedEcgData[selectedEcgData.length - 1].bpm
                                      : 70,
                                  )}
                          </div>
                        </div>
                      </div>

                      {/* Live Vitals Grid */}
                      {vitals && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <span className="w-2 h-2 rounded-full bg-[#4CAF78]"></span>{" "}
                              SpO₂
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.spO2}
                              <span className="text-xs text-[#7A8A76] ml-0.5">
                                %
                              </span>
                            </span>
                          </div>
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <Activity className="w-3 h-3" /> HRV
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.hrv}
                              <span className="text-xs text-[#7A8A76] ml-0.5">
                                ms
                              </span>
                            </span>
                          </div>
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <Brain className="w-3 h-3" /> Stress
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.stress}
                              <span className="text-xs text-[#7A8A76] ml-0.5">
                                /100
                              </span>
                            </span>
                          </div>
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <Thermometer className="w-3 h-3" /> Body Temp
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.bodyTemp}
                              <span className="text-xs text-[#7A8A76] ml-0.5">
                                °F
                              </span>
                            </span>
                          </div>
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <Heart className="w-3 h-3" /> Blood Pressure
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.bloodPressureSys}
                              <span className="text-xs text-[#7A8A76]">/</span>
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.bloodPressureDia}
                            </span>
                          </div>
                          <div className="bg-[#1C2B1E] rounded-xl p-3 border border-[rgba(212,184,150,0.08)]">
                            <div className="flex items-center gap-1.5 text-[#9BA897] text-[10px] uppercase tracking-wider mb-1">
                              <Wind className="w-3 h-3" /> Resp Rate
                            </div>
                            <span className="font-mono-data text-xl text-[#F0E6D3]">
                              {selectedIsCalculating ? '...' : selectedMonitorOff ? '0' : vitals.respRate}
                              <span className="text-xs text-[#7A8A76] ml-0.5">
                                br/min
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Live ECG Strip */}
                      <div className="bg-[#0C1210] rounded-2xl border border-[rgba(76,175,120,0.2)] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#4CAF78]" />
                            <span className="text-sm font-poppins font-semibold text-[#F0E6D3]">
                              Live ECG Telemetry
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-[#1C2B1E] px-3 py-1 rounded-full border border-[rgba(76,175,120,0.3)]">
                            <span className="w-2 h-2 rounded-full bg-[#4CAF78] animate-pulse shadow-[0_0_6px_#4CAF78]" />
                            <span className="text-[#4CAF78] text-[10px] font-mono font-bold uppercase tracking-wider">
                              Live
                            </span>
                          </div>
                        </div>
                        <LiveECGChart
                          bpm={
                            selectedMonitorOff
                              ? 0
                              : selectedEcgData.length > 0
                                ? selectedEcgData[selectedEcgData.length - 1].bpm
                                : 72
                          }
                          height={160}
                          color={selectedMonitorOff ? '#E05252' : '#4CAF78'}
                          bufferSize={100}
                        />
                      </div>

                      <div className="card-style p-5">
                        <h3 className="font-poppins text-[#D4B896] mb-4 flex items-center">
                          <Phone className="w-5 h-5 mr-2" /> Emergency Contacts
                        </h3>
                        <div className="bg-[#111811] p-3 rounded-xl border border-[rgba(212,184,150,0.1)] flex justify-between items-center">
                          <div>
                            <p className="text-[#F0E6D3] font-medium">
                              {selectedPatient?.emergencyContact1Name ||
                                "Emergency Services"}
                            </p>
                            <p className="text-[#7A8A76] text-sm">
                              {selectedPatient?.emergencyContact1Phone || "112"}
                            </p>
                          </div>
                          <a
                            href={`tel:${selectedPatient?.emergencyContact1Phone || "112"}`}
                            className="bg-[#4A6741] text-[#F0E6D3] px-3 py-1.5 rounded-lg text-sm"
                          >
                            Call
                          </a>
                        </div>
                      </div>

                      {/* Diagnostic Reports linked with Dashboard */}
                      <div className="bg-[#141E18] rounded-2xl p-5 border border-[rgba(212,184,150,0.1)]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[#D4B896]" />
                            <h4 className="font-poppins font-semibold text-sm text-[#F0E6D3]">
                              Diagnostic Reports
                            </h4>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 bg-[rgba(76,175,120,0.1)] text-[#4CAF78] border border-[#4CAF78]/30 rounded-full font-bold uppercase tracking-wider">
                            Synced • Live
                          </span>
                        </div>
                        {vitals ? (
                          <DiagnosticReportsList vitals={vitals} />
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-6 h-6 border-2 border-[#4CAF78] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-xs text-[#9BA897]">
                              Syncing live vitals from device...
                            </p>
                          </div>
                        )}
                      </div>
                    </Tabs.Content>

                    <Tabs.Content
                      value="ecg history"
                      className="space-y-4 outline-none"
                    >
                      <div className="flex space-x-2 mb-4">
                        {(["LIVE", "1H", "24H", "7D", "30D"] as const).map(
                          (p) => (
                            <button
                              key={p}
                              onClick={() => setEcgTimeRange(p)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${ecgTimeRange === p ? "bg-[#3D5738] text-[#D4B896] border-[#D4B896]" : "bg-[#1C2B1E] text-[#9BA897] border-[#2A3D2E] hover:border-[#D4B896] hover:text-[#D4B896]"}`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      </div>

                      <div
                        className="card-style p-4 border border-[#3D5738]"
                        style={{ height: 280 }}
                      >
                        {ecgTimeRange === "LIVE" ? (
                          <LiveECGChart
                            bpm={
                              selectedEcgData.length > 0
                                ? selectedEcgData[selectedEcgData.length - 1]
                                    .bpm
                                : 72
                            }
                            height="100%"
                            color="#4CAF78"
                            bufferSize={150}
                          />
                        ) : (
                          <HistoryChart
                            range={ecgTimeRange}
                            baseBpm={
                              selectedEcgData.length > 0
                                ? selectedEcgData[selectedEcgData.length - 1]
                                    .bpm
                                : 72
                            }
                          />
                        )}
                      </div>
                    </Tabs.Content>

                    <Tabs.Content
                      value="alerts"
                      className="outline-none space-y-3"
                    >
                      {patientAlerts.length === 0 ? (
                        <div className="text-center py-12">
                          <Zap className="h-12 w-12 text-[#9BA897] mx-auto mb-4 opacity-50" />
                          <p className="text-[#9BA897]">
                            No alerts for this patient.
                          </p>
                        </div>
                      ) : (
                        patientAlerts.map((alert) => {
                          const isActive = alert.status !== "resolved";
                          const isEmergency = alert.type === "cardiac";
                          return (
                            <motion.div
                              key={alert.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`rounded-xl border p-4 ${
                                isActive
                                  ? isEmergency
                                    ? "bg-[#2D1515] border-[#E05252]/30"
                                    : "bg-[#2B2515] border-[#D4B896]/30"
                                  : "bg-[#1C2B1E] border-[rgba(212,184,150,0.08)]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle
                                    className={`w-4 h-4 ${
                                      isActive
                                        ? isEmergency
                                          ? "text-[#E05252]"
                                          : "text-[#D4B896]"
                                        : "text-[#4CAF78]"
                                    }`}
                                  />
                                  <span
                                    className={`text-xs font-bold uppercase tracking-wider ${
                                      isActive
                                        ? isEmergency
                                          ? "text-[#E05252]"
                                          : "text-[#D4B896]"
                                        : "text-[#4CAF78]"
                                    }`}
                                  >
                                    {isEmergency
                                      ? "🚨 Emergency SOS"
                                      : "🆘 Support Request"}
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                                    isActive
                                      ? "bg-[#E05252]/15 text-[#E05252] border border-[#E05252]/30"
                                      : "bg-[#4CAF78]/15 text-[#4CAF78] border border-[#4CAF78]/30"
                                  }`}
                                >
                                  {alert.status}
                                </span>
                              </div>
                              <p className="text-[#9BA897] text-xs">
                                {format(
                                  new Date(alert.createdAt),
                                  "MMM dd, yyyy — h:mm a",
                                )}
                              </p>
                              {alert.timeline && (
                                <div className="mt-3 space-y-1.5">
                                  {alert.timeline.map((step, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-2 text-xs"
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          step.completed
                                            ? "bg-[#4CAF78]"
                                            : "bg-[#2A3D2E]"
                                        }`}
                                      />
                                      <span
                                        className={
                                          step.completed
                                            ? "text-[#F0E6D3]"
                                            : "text-[#5C6B58]"
                                        }
                                      >
                                        {step.step}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          );
                        })
                      )}
                    </Tabs.Content>

                    <Tabs.Content
                      value="settings"
                      className="space-y-6 outline-none"
                    >
                      <div className="card-style p-5">
                        <h3 className="font-poppins text-[#F0E6D3] mb-4">
                          Monitoring Mode
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {["normal", "sleep", "parkinson"].map((m) => (
                            <button
                              key={m}
                              onClick={() => handleSaveSettings({ mode: m })}
                              className={`py-3 rounded-xl border font-medium capitalize transition-all ${
                                (selectedPatient?.mode ?? "normal") === m
                                  ? "bg-[rgba(212,184,150,0.1)] border-[#D4B896] text-[#D4B896]"
                                  : "bg-[#111811] border-[#2A3D2E] text-[#7A8A76] hover:border-[#5B7F52]"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>

                        <div className="mt-8 space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-[#F0E6D3]">
                                Upper BPM Threshold (Critical)
                              </span>
                              <span className="text-[#E05252] font-mono-data">
                                130 BPM
                              </span>
                            </div>
                            <input
                              type="range"
                              min="100"
                              max="180"
                              defaultValue="130"
                              className="w-full accent-[#E05252]"
                            />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-[#F0E6D3]">
                                Lower BPM Threshold (Critical)
                              </span>
                              <span className="text-[#E05252] font-mono-data">
                                50 BPM
                              </span>
                            </div>
                            <input
                              type="range"
                              min="30"
                              max="70"
                              defaultValue="50"
                              className="w-full accent-[#E05252]"
                            />
                          </div>
                        </div>

                        <button className="mt-8 w-full btn-primary h-12">
                          Save Thresholds
                        </button>
                      </div>
                    </Tabs.Content>

                    <Tabs.Content
                      value="notes"
                      className="outline-none h-full flex flex-col"
                    >
                      <textarea
                        className="flex-1 w-full bg-[#111811] border border-[#2A3D2E] rounded-xl p-4 text-[#F0E6D3] placeholder-[#5C6B58] focus:border-[#D4B896] focus:ring-1 focus:ring-[#D4B896] outline-none transition-all resize-none min-h-[300px]"
                        placeholder="Add medical notes, observations..."
                      ></textarea>
                      <button className="btn-primary mt-4 py-3">
                        Save Notes
                      </button>
                    </Tabs.Content>
                  </div>
                </Tabs.Root>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Separate HistoryChart component for clean memoization ──────
function HistoryChart({
  range,
  baseBpm,
}: {
  range: "1H" | "24H" | "7D" | "30D";
  baseBpm: number;
}) {
  const historyData = useMemo(
    () => generateHistoryData(range, baseBpm),
    [range, baseBpm],
  );

  const fmtConfig = {
    "1H": { fmt: "HH:mm", tooltipFmt: "HH:mm:ss" },
    "24H": { fmt: "HH:mm", tooltipFmt: "MMM dd, HH:mm" },
    "7D": { fmt: "EEE HH:mm", tooltipFmt: "EEE, MMM dd HH:mm" },
    "30D": { fmt: "MMM dd", tooltipFmt: "MMM dd, yyyy" },
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "80px",
        minWidth: "100px",
      }}
    >
      <ResponsiveContainer width="100%" height={240} minWidth={100}>
        <AreaChart data={historyData}>
          <defs>
            <linearGradient id="histBpmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4B896" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#D4B896" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(212,184,150,0.07)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="#7A8A76"
            fontSize={10}
            tickMargin={8}
            interval={Math.max(0, Math.floor(historyData.length / 8) - 1)}
          />
          <YAxis
            domain={["dataMin - 5", "dataMax + 5"]}
            stroke="#7A8A76"
            fontSize={11}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: "#1C2B1E",
              border: "1px solid #D4B896",
              borderRadius: "12px",
              color: "#F0E6D3",
              fontSize: "12px",
            }}
            labelFormatter={(_, payload) => {
              if (payload?.[0]?.payload?.timestamp) {
                return format(
                  new Date(payload[0].payload.timestamp),
                  fmtConfig[range].tooltipFmt,
                );
              }
              return "";
            }}
            formatter={(value: unknown) => [
              typeof value === "number" ? `${value} BPM` : "--",
              "Heart Rate",
            ]}
          />
          <Area
            type="monotone"
            dataKey="bpm"
            stroke="#D4B896"
            strokeWidth={2}
            fill="url(#histBpmGrad)"
            dot={false}
            isAnimationActive={true}
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
