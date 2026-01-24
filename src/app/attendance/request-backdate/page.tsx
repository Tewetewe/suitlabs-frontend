"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";

export default function RequestBackdatePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    requested_date: "",
    clock_in_time: "",
    clock_out_time: "",
    reason: "",
  });

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "staff" && user.role !== "admin")) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.requested_date || !formData.reason) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        "https://api.stg.trywiguna.xyz/api/v1/attendance/backdate-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requested_date: formData.requested_date,
            clock_in_time: formData.clock_in_time
              ? `${formData.requested_date} ${formData.clock_in_time}:00`
              : null,
            clock_out_time: formData.clock_out_time
              ? `${formData.requested_date} ${formData.clock_out_time}:00`
              : null,
            reason: formData.reason,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Backdate request submitted successfully!");
        setFormData({
          requested_date: "",
          clock_in_time: "",
          clock_out_time: "",
          reason: "",
        });
        setTimeout(() => router.push("/attendance"), 2000);
      } else {
        setError("Failed to submit backdate request");
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      setError("Failed to submit backdate request");
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-3xl font-bold mb-6">Request Backdate Attendance</h1>

      <Button
        onClick={() => router.push("/attendance")}
        className="mb-6 bg-gray-600 hover:bg-gray-700"
      >
        ← Back to Attendance
      </Button>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-4 rounded mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            required
            value={formData.requested_date}
            onChange={(e) =>
              setFormData({
                ...formData,
                requested_date: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clock In Time
          </label>
          <input
            type="time"
            value={formData.clock_in_time}
            onChange={(e) =>
              setFormData({
                ...formData,
                clock_in_time: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clock Out Time
          </label>
          <input
            type="time"
            value={formData.clock_out_time}
            onChange={(e) =>
              setFormData({
                ...formData,
                clock_out_time: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason <span className="text-red-600">*</span>
          </label>
          <textarea
            required
            value={formData.reason}
            onChange={(e) =>
              setFormData({
                ...formData,
                reason: e.target.value,
              })
            }
            className="w-full border rounded px-3 py-2 h-24"
            placeholder="Please explain the reason for the backdate request"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </form>
    </div>
  );
}
