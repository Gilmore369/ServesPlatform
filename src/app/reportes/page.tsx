'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OperationalReports from '@/components/reports/OperationalReports';
import CapacityReports from '@/components/reports/CapacityReports';
import FinancialReports from '@/components/reports/FinancialReports';

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600 mt-2">
          Análisis y métricas operacionales para la toma de decisiones
        </p>
      </div>

      <Tabs defaultValue="operational" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operational">Operacionales</TabsTrigger>
          <TabsTrigger value="capacity">Capacidad</TabsTrigger>
          <TabsTrigger value="financial">Financieros</TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="space-y-6">
          <OperationalReports />
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          <CapacityReports />
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <FinancialReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}