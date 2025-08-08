import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Navigation, Car } from 'lucide-react';

interface ParkingSpace {
  id: string;
  name: string;
  availableSpaces: number;
  totalSpaces: number;
  distance: string;
  address: string;
  googleMapsUrl: string;
}

const mockParkingSpaces: ParkingSpace[] = [
  {
    id: '1',
    name: 'City Center Parking',
    availableSpaces: 45,
    totalSpaces: 200,
    distance: '0.2 km',
    address: '123 Main St, Clayton',
    googleMapsUrl: 'https://maps.google.com?q=123+Main+St+Clayton'
  },
  {
    id: '2',
    name: 'Shopping Mall Garage',
    availableSpaces: 12,
    totalSpaces: 150,
    distance: '0.5 km',
    address: '456 Royalty Street, Clayton',
    googleMapsUrl: 'https://maps.google.com?q=456+Royalty+Street+Clayton'
  },
  {
    id: '3',
    name: 'Metro Station Parking',
    availableSpaces: 8,
    totalSpaces: 80,
    distance: '0.7 km',
    address: '789 Transit Way, Clayton',
    googleMapsUrl: 'https://maps.google.com?q=789+Transit+Way+Clayton'
  },
  {
    id: '4',
    name: 'University Parking Lot',
    availableSpaces: 23,
    totalSpaces: 120,
    distance: '1.1 km',
    address: '321 Campus Drive, Clayton',
    googleMapsUrl: 'https://maps.google.com?q=321+Campus+Drive+Clayton'
  }
];

export function ParkingSearch() {
  const [searchLocation, setSearchLocation] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [parkingSpaces, setParkingSpaces] = useState<ParkingSpace[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      // Only show parking spaces with available spots (as per requirement 2.1)
      const availableSpaces = mockParkingSpaces.filter(space => space.availableSpaces > 0);
      setParkingSpaces(availableSpaces);
      setIsSearching(false);
    }, 1000);
  };

  const getAvailabilityColor = (available: number, total: number) => {
    const ratio = available / total;
    if (ratio > 0.5) return 'bg-green-500';
    if (ratio > 0.2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find Parking Near You</CardTitle>
          <CardDescription>
            Search for available parking spaces in your area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter your current location..."
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Find Parking'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {parkingSpaces.length > 0 && (
        <div className="space-y-4">
          <h3>Available Parking Spaces</h3>
          <div className="grid gap-4">
            {parkingSpaces.map((space) => (
              <Card key={space.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{space.name}</h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-white ${getAvailabilityColor(space.availableSpaces, space.totalSpaces)}`}
                        >
                          {space.availableSpaces} available
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {space.distance}
                        </div>
                        <div className="flex items-center gap-1">
                          <Car className="h-4 w-4" />
                          {space.availableSpaces}/{space.totalSpaces} spaces
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{space.address}</p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(space.googleMapsUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Navigation className="h-4 w-4" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}