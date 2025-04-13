"use client";
import React from "react";

import { useHandleStreamResponse } from "../utilities/runtime-helpers";

function MainComponent() {
  const [location, setLocation] = useState("");
  const [selectedDentist, setSelectedDentist] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transitDirections, setTransitDirections] = useState(null);
  const [reviewAnalysis, setReviewAnalysis] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      setStreamingMessage("");
      setReviewAnalysis(message);
    },
  });

  const handleLocationInput = async (input) => {
    setLocation(input);
    if (input.length > 2) {
      try {
        const response = await fetch(
          `/integrations/google-place-autocomplete/autocomplete/json?input=${encodeURIComponent(
            input
          )}&radius=50000`
        );
        if (!response.ok) throw new Error("Failed to fetch suggestions");
        const data = await response.json();
        setSuggestions(data.predictions);
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const searchDentists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/integrations/local-business-data/search?query=${encodeURIComponent(
          "dentist near " + location
        )}&limit=10&business_status=OPEN`
      );

      if (!response.ok) throw new Error("Failed to fetch dentists");
      const data = await response.json();
      setDentists(data.data || []);
    } catch (err) {
      console.error("Error searching dentists:", err);
      setError("Failed to search for dentists. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getTransitDirections = async (dentist) => {
    try {
      const response = await fetch(`/api/sfmta-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: `${dentist.latitude},${dentist.longitude}`,
          origin: location,
        }),
      });
      if (!response.ok) throw new Error("Failed to get transit directions");
      const data = await response.json();
      setTransitDirections(data);
    } catch (err) {
      console.error("Error getting transit directions:", err);
      setError("Failed to get transit directions");
    }
  };

  const analyzeReviews = async (dentist) => {
    try {
      const response = await fetch("/api/analyze-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: dentist.place_id }),
      });
      if (!response.ok) throw new Error("Failed to analyze reviews");
      const data = await response.json();
      setReviewAnalysis(data);
    } catch (err) {
      console.error("Error analyzing reviews:", err);
      setError("Failed to analyze reviews");
    }
  };

  const selectDentist = async (dentist) => {
    setSelectedDentist(dentist);
    await Promise.all([getTransitDirections(dentist), analyzeReviews(dentist)]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">
          Find a Dentist Near You
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationInput(e.target.value)}
              placeholder="Enter your location"
              className="w-full p-3 border rounded-lg"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setLocation(suggestion.description);
                      setSuggestions([]);
                    }}
                  >
                    {suggestion.description}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={searchDentists}
              disabled={!location || loading}
              className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Searching..." : "Find Dentists"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {dentists.map((dentist) => (
              <div
                key={dentist.place_id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold text-blue-800">
                  {dentist.name}
                </h2>
                <p className="text-gray-600">{dentist.formatted_address}</p>
                <div className="mt-2">
                  <span className="text-yellow-500">
                    {"★".repeat(Math.round(dentist.rating))}
                  </span>
                  <span className="text-gray-600">
                    {" "}
                    ({dentist.review_count} reviews)
                  </span>
                </div>
                <button
                  onClick={() => selectDentist(dentist)}
                  className="mt-4 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>

          {selectedDentist && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-blue-800 mb-4">
                {selectedDentist.name}
              </h2>

              {transitDirections && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Transit Directions
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {transitDirections.routes?.map((route, index) => (
                      <div key={index} className="mb-2">
                        <span className="font-medium">
                          Route {route.name}:{" "}
                        </span>
                        {route.instructions}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewAnalysis && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Review Analysis
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">{reviewAnalysis.analysis?.summary}</p>
                    <div className="mb-2">
                      <strong>Strengths:</strong>
                      <ul className="list-disc list-inside">
                        {reviewAnalysis.analysis?.strengths.map(
                          (strength, i) => (
                            <li key={i}>{strength}</li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <strong>Areas for Improvement:</strong>
                      <ul className="list-disc list-inside">
                        {reviewAnalysis.analysis?.improvements.map(
                          (improvement, i) => (
                            <li key={i}>{improvement}</li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainComponent;