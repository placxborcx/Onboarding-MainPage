import { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Clock } from 'lucide-react';

interface CongestionData {
  id: string;
  area: string;
  street: string;
  congestionLevel: 'low' | 'medium' | 'high';
  availableSpaces: number;
  totalSpaces: number;
  predictedTime: string;
}

const mockCongestionData: CongestionData[] = [
  {
    id: '1',
    area: 'Clayton',
    street: 'Royalty Street',
    congestionLevel: 'high',
    availableSpaces: 5,
    totalSpaces: 100,
    predictedTime: '2:00 PM - 4:00 PM'
  },
  {
    id: '2',
    area: 'Clayton',
    street: 'Main Street',
    congestionLevel: 'medium',
    availableSpaces: 25,
    totalSpaces: 80,
    predictedTime: '1:00 PM - 3:00 PM'
  },
  {
    id: '3',
    area: 'Clayton',
    street: 'Campus Drive',
    congestionLevel: 'low',
    availableSpaces: 45,
    totalSpaces: 60,
    predictedTime: '11:00 AM - 1:00 PM'
  },
  {
    id: '4',
    area: 'Downtown',
    street: 'Business Street',
    congestionLevel: 'high',
    availableSpaces: 8,
    totalSpaces: 120,
    predictedTime: '12:00 PM - 6:00 PM'
  },
  {
    id: '5',
    area: 'Downtown',
    street: 'Park Avenue',
    congestionLevel: 'medium',
    availableSpaces: 18,
    totalSpaces: 50,
    predictedTime: '2:00 PM - 5:00 PM'
  },
  {
    id: '6',
    area: 'Suburbs',
    street: 'Residential Way',
    congestionLevel: 'low',
    availableSpaces: 35,
    totalSpaces: 40,
    predictedTime: '9:00 AM - 11:00 AM'
  }
];

export function CongestionPrediction() {
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedStreet, setSelectedStreet] = useState<string>('');
  const [filteredData, setFilteredData] = useState<CongestionData[]>([]);

  const areas = [...new Set(mockCongestionData.map(item => item.area))];
  const streets = selectedArea 
    ? [...new Set(mockCongestionData.filter(item => item.area === selectedArea).map(item => item.street))]
    : [];

  const handleFilter = () => {
    let filtered = mockCongestionData;
    
    if (selectedArea) {
      filtered = filtered.filter(item => item.area === selectedArea);
    }
    
    if (selectedStreet) {
      filtered = filtered.filter(item => item.street === selectedStreet);
    }
    
    setFilteredData(filtered);
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCongestionLabel = (level: string) => {
    switch (level) {
      case 'low': return 'Low Congestion';
      case 'medium': return 'Medium Congestion';
      case 'high': return 'High Congestion';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parking Congestion Prediction</CardTitle>
          <CardDescription>
            Filter by area and street to view predicted congestion levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger>
                <SelectValue placeholder="Select Area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={selectedStreet} 
              onValueChange={setSelectedStreet}
              disabled={!selectedArea}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Street" />
              </SelectTrigger>
              <SelectContent>
                {streets.map((street) => (
                  <SelectItem key={street} value={street}>
                    {street}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleFilter}>
              Show Predictions
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredData.length > 0 && (
        <div className="space-y-4">
          <h3>Congestion Predictions</h3>
          <div className="grid gap-4">
            {filteredData.map((data) => (
              <Card key={data.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{data.street}, {data.area}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-white ${getCongestionColor(data.congestionLevel)}`}
                        >
                          {getCongestionLabel(data.congestionLevel)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {data.availableSpaces}/{data.totalSpaces} spaces available
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Peak time: {data.predictedTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Color Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Congestion Level Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Low Congestion (60%+ spaces available)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Medium Congestion (20-60% spaces available)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">High Congestion (&lt;20% spaces available)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}