import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { MapPin, BarChart3 } from 'lucide-react';
import { ParkingSearch } from './components/ParkingSearch';
import { PopulationAnalysis } from './components/PopulationAnalysis';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-2xl font-medium">Smart City Analytics</h1>
        <p className="text-muted-foreground mt-1">Parking search and Melbourne population insights</p>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Nearby Search
            </TabsTrigger>
            <TabsTrigger value="population" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Melbourne Population Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-6">
            <ParkingSearch />
          </TabsContent>

          <TabsContent value="population" className="mt-6">
            <PopulationAnalysis />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}