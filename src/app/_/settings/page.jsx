"use client";
import React from "react";

function MainComponent() {
  const [keys, setKeys] = useState({
    googleMaps: "",
    yelp: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(keys),
      });

      if (!response.ok) {
        throw new Error("Failed to save API keys");
      }

      setSuccess(true);
    } catch (err) {
      console.error("Error saving API keys:", err);
      setError("Failed to save API keys. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setKeys((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-6">
            API Settings
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Maps API Key
              </label>
              <input
                type="password"
                name="googleMaps"
                value={keys.googleMaps}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Google Maps API Key"
              />
              <p className="mt-1 text-sm text-gray-500">
                Used for maps and location services
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yelp API Key
              </label>
              <input
                type="password"
                name="yelp"
                value={keys.yelp}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Yelp API Key"
              />
              <p className="mt-1 text-sm text-gray-500">
                Used for business information and reviews
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded">{error}</div>
            )}

            {success && (
              <div className="p-3 bg-green-50 text-green-700 rounded">
                API keys saved successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Saving..." : "Save API Keys"}
            </button>
          </form>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Security Note
            </h2>
            <p className="text-sm text-gray-600">
              Your API keys are encrypted before being stored. Never share your
              API keys or expose them in client-side code. If you suspect your
              keys have been compromised, please regenerate them immediately
              from their respective platforms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainComponent;