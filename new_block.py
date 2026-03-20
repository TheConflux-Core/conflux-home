import sys

new_block = '''          {(() => {
            // Group schedules by relatedMission, preserving order
            const groups: Record<string, AgentSchedule[]> = {};
            schedules.forEach(schedule => {
              const groupKey = schedule.relatedMission || "Other";
              if (!groups[groupKey]) groups[groupKey] = [];
              groups[groupKey].push(schedule);
            });
            const groupKeys = Object.keys(groups).sort();
            
            return groupKeys.flatMap((groupKey) => {
              const groupSchedules = groups[groupKey];
              return [
                // Group heading
                <div key={`heading-${groupKey}`} className="mt-4 mb-2">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    {groupKey}
                  </h3>
                </div>,
                // Schedule buttons
                ...groupSchedules.map((schedule) => {
                  const selected = selectedId === schedule.id;
                  return (
                    <button
                      key={schedule.id}
                      onClick={() => onSelect(schedule.id)}
                      className={`w-full rounded-[18px] border p-4 text-left transition ${
                        selected
                          ? "border-cyan-300/18 bg-cyan-400/8"
                          : "border-white/8 bg-slate-950/28 hover:border-white/12 hover:bg-slate-950/34"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_140px_180px_180px_120px] xl:items-start">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">
                              {schedule.name}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                              {schedule.cadenceLabel}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Agent
                            </div>
                            <div className="mt-1">
                              <Link
                                href={`/agents?agent=${encodeURIComponent(schedule.agent)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-cyan-200 transition hover:text-cyan-100"
                              >
                                {schedule.agent}
                              </Link>
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Next Run
                            </div>
                            <div className="mt-1 text-sm text-slate-200">
                              {formatDateTime(schedule.nextRunAt)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Last Run
                            </div>
                            <div className="mt-1 text-sm text-slate-200">
                              {schedule.lastRunAt
                                ? formatDateTime(schedule.lastRunAt)
                                : "—"}
                            </div>
                          </div>

                          <div className="flex xl:justify-end">
                            <span
                              className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${statusClasses(
                                schedule.status,
                              )}`}
                            >
                              {schedule.status}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Task
                            </div>
                            <div className="mt-1 text-sm leading-6 text-slate-200 break-words">
                              {schedule.task}
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              Context
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {schedule.relatedMission ? (
                                <Link
                                  href={`/missions?q=${encodeURIComponent(schedule.relatedMission)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-full border border-violet-400/18 bg-violet-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-violet-200 transition hover:bg-violet-500/15"
                                >
                                  Mission · {schedule.relatedMission}
                                </Link>
                              ) : null}

                              {schedule.relatedProductId &&
                              schedule.relatedProductName ? (
                                <Link
                                  href={`/portfolio/${schedule.relatedProductId}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded-full border border-emerald-400/18 bg-emerald-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/15"
                                >
                                  Product · {schedule.relatedProductName}
                                </Link>
                              ) : null}

                              <Link
                                href={`/runs?scheduleId=${encodeURIComponent(schedule.id)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded-full border border-cyan-300/18 bg-cyan-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-cyan-200 transition hover:bg-cyan-400/15"
                              >
                                Runs · {schedule.name}
                              </Link>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            <span>Mission Control Runway</span>
                            <span className="font-mono">{schedule.cron}</span>
                          </div>

                          <div className="grid grid-cols-6 gap-2">
                            {[0, 1, 2, 3, 4, 5].map((tick) => (
                              <div
                                key={tick}
                                className={`h-2 rounded-full ${
                                  tick === 1 && schedule.status === "running"
                                    ? "bg-cyan-300"
                                    : tick === 2 && schedule.status === "warning"
                                      ? "bg-amber-300"
                                      : tick === 3 && schedule.status === "failed"
                                        ? "bg-rose-300"
                                        : tick === 4 && schedule.status === "paused"
                                          ? "bg-violet-300"
                                          : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                }),
              ];
            });
          })()}

          {schedules.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
              No schedules match the current filters.
            </div>
          ) : null}'''

print(new_block)