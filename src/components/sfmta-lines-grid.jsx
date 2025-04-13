"use client";
import React from "react";



export default function Index() {
  return (function MainComponent({
  lines = [],
  loading = false,
  error = null,
  selectedLine = null,
  patterns = [],
  loadingPatterns = false,
  onLineClick = () => {},
}) {
  const [expandedPatterns, setExpandedPatterns] = React.useState(new Set());
  const [selectedStop, setSelectedStop] = React.useState(null);
  const [stopData, setStopData] = React.useState(null);
  const [loadingStop, setLoadingStop] = React.useState(false);

  function togglePatternExpansion(patternId, e) {
    e.stopPropagation();
    setExpandedPatterns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(patternId)) {
        newSet.delete(patternId);
      } else {
        newSet.add(patternId);
      }
      return newSet;
    });
  }

  async function handleStopClick(stop) {
    setSelectedStop(stop);
    setLoadingStop(true);
    try {
      const response = await fetch("/api/sfmta-stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stopCode: stop.ScheduledStopPointRef,
        }),
      });
      const data = await response.json();
      setStopData(data.body);
    } catch (error) {
      console.error("Error fetching stop data:", error);
    } finally {
      setLoadingStop(false);
    }
  }

  function formatTime(isoTime) {
    if (!isoTime) return null;
    const date = new Date(isoTime);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function getLineColor(name) {
    if (name.includes("MUNI METRO")) return "bg-blue-100";
    if (name.includes("OWL")) return "bg-purple-100";
    if (name.includes("RAPID")) return "bg-red-100";
    if (name.includes("EXPRESS")) return "bg-green-100";
    return "bg-gray-100";
  }

  function organizePatternsByDirection(data) {
    if (!data?.directions || !data?.journeyPatterns) return null;

    const outboundPattern = data.journeyPatterns
      .filter((pattern) => pattern.DirectionRef === "OB")
      .reduce(
        (highest, current) =>
          current.TripCount > highest.TripCount ? current : highest,
        { TripCount: -1 },
      );

    const inboundPattern = data.journeyPatterns
      .filter((pattern) => pattern.DirectionRef === "IB")
      .reduce(
        (highest, current) =>
          current.TripCount > highest.TripCount ? current : highest,
        { TripCount: -1 },
      );

    return data.directions.map((direction) => {
      const isInbound = direction.DirectionId === "IB";
      const pattern = isInbound ? inboundPattern : outboundPattern;
      const oppositePattern = isInbound ? outboundPattern : inboundPattern;

      let allStops = [
        ...(pattern.PointsInSequence?.StopPointInJourneyPattern || []),
        ...(pattern.PointsInSequence?.TimingPointInJourneyPattern || []),
      ].sort((a, b) => Number(a.Order) - Number(b.Order));

      return {
        ...direction,
        pattern: {
          ...pattern,
          Name:
            oppositePattern.Name ||
            oppositePattern.DestinationDisplayView?.FontText,
          DestinationDisplayView: oppositePattern.DestinationDisplayView,
          TripCount: pattern.TripCount,
          PointsInSequence: {
            StopPointInJourneyPattern: allStops,
          },
        },
      };
    });
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {selectedLine ? (
        <div>
          <button
            onClick={() => onLineClick(null)}
            className="mb-6 inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Transit Lines
          </button>

          {loadingPatterns ? (
            <div className="space-y-4">
              <div className="animate-pulse bg-gray-100 rounded-lg p-4 h-24" />
              <div className="animate-pulse bg-gray-100 rounded-lg p-4 h-24" />
            </div>
          ) : patterns ? (
            <div>
              <h3 className="text-xl font-medium mb-4">
                Line {selectedLine} Patterns
              </h3>
              {organizePatternsByDirection(patterns)?.map((direction, idx) => (
                <div key={idx} className="mb-8">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">
                    {direction.Name}
                  </h4>
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="space-y-2">
                      {direction.pattern.PointsInSequence?.StopPointInJourneyPattern?.slice(
                        0,
                        expandedPatterns.has(
                          direction.pattern.serviceJourneyPatternRef,
                        )
                          ? undefined
                          : 5,
                      ).map((stop, stopIdx) => (
                        <div key={stopIdx} className="flex flex-col w-full">
                          <div
                            onClick={() => handleStopClick(stop)}
                            className="flex items-center text-sm cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                          >
                            <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2 text-xs">
                              {stop.Order}
                            </span>
                            <span className="text-gray-700">{stop.Name}</span>
                            <i className="fas fa-clock ml-auto text-gray-400"></i>
                          </div>

                          {selectedStop?.ScheduledStopPointRef ===
                            stop.ScheduledStopPointRef && (
                            <div className="ml-8 mt-2 mb-2 p-3 bg-gray-50 rounded-md">
                              {loadingStop ? (
                                <div className="space-y-2">
                                  <div className="animate-pulse h-4 bg-gray-200 rounded w-32"></div>
                                  <div className="animate-pulse h-4 bg-gray-200 rounded w-24"></div>
                                </div>
                              ) : (
                                <>
                                  {stopData?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit?.filter(
                                    (visit) => {
                                      const arrivalTime =
                                        visit.MonitoredVehicleJourney
                                          ?.MonitoredCall?.ExpectedArrivalTime;
                                      return (
                                        arrivalTime &&
                                        new Date(arrivalTime) > new Date()
                                      );
                                    },
                                  ).map((visit, i) => {
                                    const estimatedTime = formatTime(
                                      visit.MonitoredVehicleJourney
                                        .MonitoredCall.ExpectedArrivalTime,
                                    );
                                    if (!estimatedTime) return null;

                                    return (
                                      <div
                                        key={i}
                                        className="text-sm text-gray-600 flex items-center mb-2 last:mb-0"
                                      >
                                        <i className="fas fa-bus mr-2 text-gray-400"></i>
                                        <span>{estimatedTime}</span>
                                      </div>
                                    );
                                  })}
                                  {(!stopData?.ServiceDelivery
                                    ?.StopMonitoringDelivery?.MonitoredStopVisit
                                    ?.length ||
                                    !stopData?.ServiceDelivery?.StopMonitoringDelivery?.MonitoredStopVisit?.some(
                                      (visit) =>
                                        visit.MonitoredVehicleJourney
                                          ?.MonitoredCall
                                          ?.ExpectedArrivalTime &&
                                        new Date(
                                          visit.MonitoredVehicleJourney
                                            .MonitoredCall.ExpectedArrivalTime,
                                        ) > new Date(),
                                    )) && (
                                    <div className="text-sm text-gray-500 flex items-center">
                                      <i className="fas fa-info-circle mr-2"></i>
                                      No upcoming arrivals
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {direction.pattern.PointsInSequence
                        ?.StopPointInJourneyPattern?.length > 5 && (
                        <button
                          onClick={(e) =>
                            togglePatternExpansion(
                              direction.pattern.serviceJourneyPatternRef,
                              e,
                            )
                          }
                          className="text-sm text-blue-600 hover:text-blue-800 transition-colors pl-8 flex items-center group"
                        >
                          {expandedPatterns.has(
                            direction.pattern.serviceJourneyPatternRef,
                          ) ? (
                            <>
                              Show less
                              <i className="fas fa-chevron-up ml-1 group-hover:transform group-hover:-translate-y-0.5 transition-transform"></i>
                            </>
                          ) : (
                            <>
                              +
                              {direction.pattern.PointsInSequence
                                .StopPointInJourneyPattern.length - 5}{" "}
                              more stops
                              <i className="fas fa-chevron-down ml-1 group-hover:transform group-hover:translate-y-0.5 transition-transform"></i>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              Failed to load patterns
            </div>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-6 font-roboto">
            SFMTA Transit Lines
          </h2>

          {loading && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="animate-pulse bg-gray-100 rounded-lg p-4 h-32"
                />
              ))}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}

          {!loading && !error && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lines.map((line) => (
                <div
                  key={line.Id}
                  onClick={() => onLineClick(line.Id)}
                  className={`p-4 rounded-lg transition-all hover:shadow-md cursor-pointer ${getLineColor(
                    line.Name,
                  )}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{line.Id}</h3>
                      <p className="text-sm text-gray-700 mt-1">{line.Name}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-white rounded-full shadow-sm">
                      {line.TransportMode}
                    </span>
                  </div>

                  {line.LineDescription && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {line.LineDescription}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StoryComponent() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [lines, setLines] = React.useState([]);
  const [selectedLine, setSelectedLine] = React.useState(null);
  const [patterns, setPatterns] = React.useState([]);
  const [loadingPatterns, setLoadingPatterns] = React.useState(false);

  React.useEffect(() => {
    async function fetchLines() {
      try {
        const response = await fetch("/api/sfmta-lines", { method: "POST" });
        if (!response.ok) {
          throw new Error("Failed to fetch SFMTA lines");
        }
        const result = await response.json();
        setLines(result.body);
      } catch (e) {
        setError("Unable to load SFMTA lines");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchLines();
  }, []);

  async function handleLineClick(lineId) {
    if (!lineId) {
      setSelectedLine(null);
      setPatterns([]);
      return;
    }

    setLoadingPatterns(true);
    setSelectedLine(lineId);
    try {
      const response = await fetch("/api/sfmta-patterns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ line_id: lineId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch patterns");
      }

      const result = await response.json();
      setPatterns(result.body);
    } catch (e) {
      console.error(e);
      setPatterns(null);
    } finally {
      setLoadingPatterns(false);
    }
  }

  return (
    <div>
      <MainComponent
        lines={lines}
        loading={loading}
        error={error}
        selectedLine={selectedLine}
        patterns={patterns}
        loadingPatterns={loadingPatterns}
        onLineClick={handleLineClick}
      />
    </div>
  );
});
}