"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/date";

interface TimeOffRequest {
  id: string;
  user_id: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  start_date: string;
  end_date: string;
  time_off_type: string;
  reason: string;
  status: string;
  approved_by_user_id: string | null;
  approved_at: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
}

export default function AdminTimeOffPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "admin") {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setError("");
        const token = localStorage.getItem("token");
        const response = await fetch(
          "https://api.stg.trywiguna.xyz/api/v1/attendance/admin/time-off-requests/pending",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRequests(Array.isArray(data) ? data : []);
        } else {
          setError("Failed to fetch time off requests");
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
        setError("Failed to fetch time off requests");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRequests();
    }
  }, [user]);

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://api.stg.trywiguna.xyz/api/v1/attendance/admin/time-off-requests/${id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== id));
      } else {
        setError("Failed to approve request");
      }
    } catch (err) {
      console.error("Error approving request:", err);
      setError("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Please enter the rejection reason:");
    if (!reason) return;

    try {
      setActionLoading(id);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `https://api.stg.trywiguna.xyz/api/v1/attendance/admin/time-off-requests/${id}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejection_reason: reason,
          }),
        }
      );

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== id));
      } else {
        setError("Failed to reject request");
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Time Off Requests</h1>

      <Button
        onClick={() => router.push("/admin/attendance")}
        className="mb-6 bg-gray-600 hover:bg-gray-700"
      >
        ← Back to Attendance
      </Button>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-6">
          {requests.length > 0 ? (
            requests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg shadow p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Employee</p>
                    <p className="font-semibold">
                      {req.user?.first_name} {req.user?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{req.user?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Date Range</p>
                    <p className="font-semibold">
                      {formatDate(req.start_date)} - {formatDate(req.end_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-semibold capitalize">{req.time_off_type}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Days</p>
                    <p className="font-semibold">
                      {Math.ceil(
                        (new Date(req.end_date).getTime() -
                          new Date(req.start_date).getTime()) /
                          (1000 * 3600 * 24)
                      ) + 1}{" "}
                      day(s)
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">Reason</p>
                  <p className="text-gray-800">{req.reason}</p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading === req.id}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No pending time off requests
            </div>
          )}
        </div>
      )}
    </div>
  );
}
