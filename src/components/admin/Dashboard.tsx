import React from 'react'

const Dashboard = () => {
  return (
    <div>
      <div className="space-y-7 animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Clients" value="24" delta="↑ 3 this month" icon="◈" accent="bg-violet-500" />
                <StatCard label="Monthly Revenue" value="₹2.4L" delta="↑ 18% vs last month" icon="◆" accent="bg-emerald-500" />
                <StatCard label="Active Projects" value="11" delta="2 deadlines this week" icon="◧" accent="bg-amber-500" />
                <StatCard label="Website Visits" value="9.3K" delta="↑ 42% this week" icon="⬡" accent="bg-sky-500" />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Traffic */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-semibold text-white">Website Traffic</p>
                      <p className="text-xs text-zinc-600">Last 12 months</p>
                    </div>
                    <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-full font-medium">+42%</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {trafficData.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div style={{ height: `${(v / 100) * 112}px` }} className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" title={`${v}k`} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {["Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar","Apr","May"].map((m) => (
                      <span key={m} className="text-[9px] text-zinc-700 flex-1 text-center">{m}</span>
                    ))}
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-semibold text-white">Revenue</p>
                      <p className="text-xs text-zinc-600">Monthly breakdown</p>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">+18%</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Branding & Design", val: 85, color: "bg-violet-500" },
                      { label: "Social Media", val: 62, color: "bg-emerald-500" },
                      { label: "Web Development", val: 45, color: "bg-sky-500" },
                      { label: "Reels & Content", val: 38, color: "bg-amber-500" },
                    ].map((r) => (
                      <div key={r.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-zinc-400">{r.label}</span>
                          <span className="text-xs text-zinc-500">{r.val}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div style={{ width: `${r.val}%` }} className={`h-full ${r.color} rounded-full`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent activity */}
                <div className="lg:col-span-2 bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-4">Recent Activity</p>
                  <div className="space-y-3">
                    {[
                      { msg: "New client Arjun Menon added", time: "2h ago", dot: "bg-violet-400" },
                      { msg: "Poster uploaded for Priya Nair", time: "5h ago", dot: "bg-emerald-400" },
                      { msg: "Website link added for Rahul Das", time: "1d ago", dot: "bg-sky-400" },
                      { msg: "Instagram Reel shared – Fashion Reel", time: "2d ago", dot: "bg-pink-400" },
                      { msg: "Client Meera Pillai marked inactive", time: "3d ago", dot: "bg-zinc-500" },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`} />
                        <p className="text-sm text-zinc-300 flex-1">{a.msg}</p>
                        <span className="text-xs text-zinc-600 whitespace-nowrap">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                  <p className="text-sm font-semibold text-white">Quick Stats</p>
                  {[
                    { label: "Posters Created", val: 38, spark: [30,45,38,50,42,55,48,60,52,65,58,70], color: "bg-violet-400" },
                    { label: "Reels Shared", val: 14, spark: [5,8,6,10,9,12,10,14,11,14,12,14], color: "bg-pink-400" },
                    { label: "Websites Launched", val: 7, spark: [1,2,2,3,3,4,4,5,5,6,6,7], color: "bg-sky-400" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-white">{s.val}</p>
                        <p className="text-xs text-zinc-600">{s.label}</p>
                      </div>
                      <Sparkline data={s.spark} color={s.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
    </div>
  )
}

export default Dashboard
