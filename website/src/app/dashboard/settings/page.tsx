'use client';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings className="text-[#C4A882]" />
        Settings
      </h1>

      <div className="bg-[#2D4A3E] rounded-xl p-6 border border-[#3D5A4E] max-w-2xl space-y-6">
        {/* Notification Preferences */}
        <section>
          <h2 className="text-lg font-semibold text-[#C4A882] mb-3">Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { label: 'Critical Alert Emails', desc: 'Get alerts for cardiac emergencies' },
              { label: 'Push Notifications', desc: 'Desktop push for new alerts' },
              { label: 'Daily Summary', desc: 'Receive daily patient summary at 8 AM' },
            ].map((item) => (
              <label key={item.label} className="flex items-center justify-between bg-[#1A2E1F] p-4 rounded-lg cursor-pointer hover:bg-[#1A2E1F]/80 transition">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-[#7A9E8A]">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#C4A882]" />
              </label>
            ))}
          </div>
        </section>

        {/* API */}
        <section>
          <h2 className="text-lg font-semibold text-[#C4A882] mb-3">API Configuration</h2>
          <div className="bg-[#1A2E1F] p-4 rounded-lg space-y-3">
            <div>
              <label className="text-xs text-[#7A9E8A] block mb-1">Cloudflare Worker URL</label>
              <input
                readOnly
                value="https://guardian-pulse-api.pranjalmishra2409.workers.dev"
                className="w-full bg-[#2D4A3E] border border-[#3D5A4E] rounded-lg px-3 py-2 text-sm text-[#F5EDD6]"
              />
            </div>
            <div>
              <label className="text-xs text-[#7A9E8A] block mb-1">Firebase Project</label>
              <input
                readOnly
                value="guardian-pulse-1360c"
                className="w-full bg-[#2D4A3E] border border-[#3D5A4E] rounded-lg px-3 py-2 text-sm text-[#F5EDD6]"
              />
            </div>
          </div>
        </section>

        {/* Danger */}
        <section>
          <h2 className="text-lg font-semibold text-red-400 mb-3">Danger Zone</h2>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-[#7A9E8A] mb-3">
              Deleting patient data is permanent and cannot be undone.
            </p>
            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/30 transition">
              Delete All Patient Data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
