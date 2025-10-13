'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { DashboardStats } from '@/types';
import { Package, Users, Calendar, DollarSign, AlertTriangle, Wrench } from 'lucide-react';

const statCards = [
  {
    title: 'Total Items',
    key: 'totalItems' as keyof DashboardStats,
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    title: 'Total Bookings',
    key: 'totalBookings' as keyof DashboardStats,
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    title: 'Active Rentals',
    key: 'activeRentals' as keyof DashboardStats,
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    title: 'Today Revenue',
    key: 'todayRevenue' as keyof DashboardStats,
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    format: 'currency',
  },
  {
    title: 'Low Stock Items',
    key: 'lowStockItems' as keyof DashboardStats,
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    title: 'Maintenance Items',
    key: 'maintenanceItems' as keyof DashboardStats,
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, format?: string) => {
    if (format === 'currency') {
      return formatCurrency(value);
    }
    return value.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.first_name}! Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            const value = stats?.[card.key] ?? 0;
            
            return (
              <Card key={card.title}>
                <CardContent className="flex items-center">
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loading ? '...' : formatValue(value, card.format)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/dashboard/bookings/new"
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Create New Booking
                </a>
                <Link
                  href="/dashboard/items/new"
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Add New Item
                </Link>
                <a
                  href="/dashboard/customers/new"
                  className="block w-full text-left px-4 py-3 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  Add New Customer
                </a>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>• New booking created for John Doe</p>
                  <p className="text-xs text-gray-400 mt-1">2 hours ago</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>• Item &quot;Black Tuxedo&quot; returned</p>
                  <p className="text-xs text-gray-400 mt-1">4 hours ago</p>
                </div>
                <div className="text-sm text-gray-600">
                  <p>• Payment received for booking #1234</p>
                  <p className="text-xs text-gray-400 mt-1">6 hours ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}