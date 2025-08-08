import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapPin, TrendingUp } from 'lucide-react';

interface TrendData {
  time: string;
  availableSpaces: number;
}

interface ParkingTrend {
  id: string;
  name: string;
  address: string;
  distance: string;
  trendData: TrendData[];
}

const mockTrendData: ParkingTrend[] = [
  {
    id: '1',
    name: 'City Center Parking',
    address: '123 Main St, Clayton',
    distance: '0.2 km from destination',
    trendData: [
      { time: '8:00', availableSpaces: 180 },
      { time: '9:00', availableSpaces: 150 },
      { time: '10:00', availableSpaces: 120 },
      { time: '11:00', availableSpaces: 90 },
      { time: '12:00', availableSpaces: 60 },
      { time: '13:00', availableSpaces: 45 },
      { time: '14:00', availableSpaces: 40 },
      { time: '15:00', availableSpaces: 35 },
      { time: '16:00', availableSpaces: 50 },
      { time: '17:00', availableSpaces: 80 },
      { time: '18:00', availableSpaces: 120 },
      { time: '19:00', availableSpaces: 160 }
    ]
  },
  {
    id: '2',
    name: 'Shopping Mall Garage',
    address: '456 Royalty Street, Clayton',
    distance: '0.4 km from destination',
    trendData: [
      { time: '8:00', availableSpaces: 140 },
      { time: '9:00', availableSpaces: 120 },
      { time: '10:00', availableSpaces: 80 },
      { time: '11:00', availableSpaces: 50 },
      { time: '12:00', availableSpaces: 30 },
      { time: '13:00', availableSpaces: 20 },
      { time: '14:00', availableSpaces: 15 },
      { time: '15:00', availableSpaces: 25 },
      { time: '16:00', availableSpaces: 40 },
      { time: '17:00', availableSpaces: 60 },
      { time: '18:00', availableSpaces: 90 },
      { time: '19:00', availableSpaces: 130 }
    ]
  }
];

export function DestinationSearch() {
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [trendData, setTrendData] = useState<ParkingTrend[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setTrendData(mockTrendData);
      setIsSearching(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Destination Parking Analysis</CardTitle>
          <CardDescription>
            Enter your destination to see parking availability trends throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter destination address..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Analyzing...' : 'Analyze Trends'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {trendData.length > 0 && (
        <div className="space-y-6">
          <h3>Parking Availability Trends Near Your Destination</h3>
          
          {trendData.map((parking) => (
            <Card key={parking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {parking.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {parking.address} • {parking.distance}
                    </CardDescription>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Available Spaces Throughout the Day</h4>
                  <p className="text-sm text-muted-foreground">
                    Track parking availability by hour to plan your visit
                  </p>
                </div>
                
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={parking.trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        label={{ 
                          value: 'Available Spaces', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { textAnchor: 'middle' }
                        }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(value) => `Time: ${value}:00`}
                        formatter={(value) => [`${value} spaces`, 'Available']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="availableSpaces" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Best times to visit:</strong> Early morning (8-9 AM) or evening (6-7 PM) 
                    for maximum parking availability.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}