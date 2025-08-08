import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, Users, Filter, BarChart3 } from 'lucide-react';

interface PopulationData {
  year: number;
  'Melbourne - Inner': number;
  'Melbourne - Inner East': number;
  'Melbourne - Inner South': number;
  'Melbourne - North East': number;
  'Melbourne - North West': number;
  'Melbourne - Outer East': number;
  'Melbourne - South East': number;
  'Melbourne - West': number;
}

interface TrendData {
  year: number;
  percentageChange: number;
  totalPopulation: number;
}

// Mock data based on typical Melbourne population trends 2011-2021
const mockPopulationData: PopulationData[] = [
  {
    year: 2011,
    'Melbourne - Inner': 178500,
    'Melbourne - Inner East': 445200,
    'Melbourne - Inner South': 312800,
    'Melbourne - North East': 378900,
    'Melbourne - North West': 445600,
    'Melbourne - Outer East': 512300,
    'Melbourne - South East': 634700,
    'Melbourne - West': 687500
  },
  {
    year: 2012,
    'Melbourne - Inner': 185200,
    'Melbourne - Inner East': 451800,
    'Melbourne - Inner South': 318900,
    'Melbourne - North East': 386700,
    'Melbourne - North West': 456200,
    'Melbourne - Outer East': 525400,
    'Melbourne - South East': 648300,
    'Melbourne - West': 702100
  },
  {
    year: 2013,
    'Melbourne - Inner': 192800,
    'Melbourne - Inner East': 458600,
    'Melbourne - Inner South': 325200,
    'Melbourne - North East': 394800,
    'Melbourne - North West': 467100,
    'Melbourne - Outer East': 538900,
    'Melbourne - South East': 662400,
    'Melbourne - West': 717200
  },
  {
    year: 2014,
    'Melbourne - Inner': 201200,
    'Melbourne - Inner East': 465700,
    'Melbourne - Inner South': 331800,
    'Melbourne - North East': 403200,
    'Melbourne - North West': 478300,
    'Melbourne - Outer East': 552800,
    'Melbourne - South East': 677100,
    'Melbourne - West': 732800
  },
  {
    year: 2015,
    'Melbourne - Inner': 210500,
    'Melbourne - Inner East': 473100,
    'Melbourne - Inner South': 338700,
    'Melbourne - North East': 412000,
    'Melbourne - North West': 489800,
    'Melbourne - Outer East': 567200,
    'Melbourne - South East': 692300,
    'Melbourne - West': 748900
  },
  {
    year: 2016,
    'Melbourne - Inner': 220800,
    'Melbourne - Inner East': 480800,
    'Melbourne - Inner South': 345900,
    'Melbourne - North East': 421200,
    'Melbourne - North West': 501700,
    'Melbourne - Outer East': 582100,
    'Melbourne - South East': 708000,
    'Melbourne - West': 765600
  },
  {
    year: 2017,
    'Melbourne - Inner': 232100,
    'Melbourne - Inner East': 488900,
    'Melbourne - Inner South': 353400,
    'Melbourne - North East': 430800,
    'Melbourne - North West': 514000,
    'Melbourne - Outer East': 597500,
    'Melbourne - South East': 724200,
    'Melbourne - West': 782900
  },
  {
    year: 2018,
    'Melbourne - Inner': 244500,
    'Melbourne - Inner East': 497300,
    'Melbourne - Inner South': 361200,
    'Melbourne - North East': 440900,
    'Melbourne - North West': 526700,
    'Melbourne - Outer East': 613400,
    'Melbourne - South East': 741000,
    'Melbourne - West': 800800
  },
  {
    year: 2019,
    'Melbourne - Inner': 258200,
    'Melbourne - Inner East': 506100,
    'Melbourne - Inner South': 369300,
    'Melbourne - North East': 451500,
    'Melbourne - North West': 539900,
    'Melbourne - Outer East': 629800,
    'Melbourne - South East': 758400,
    'Melbourne - West': 819300
  },
  {
    year: 2020,
    'Melbourne - Inner': 273100,
    'Melbourne - Inner East': 515200,
    'Melbourne - Inner South': 377700,
    'Melbourne - North East': 462600,
    'Melbourne - North West': 553600,
    'Melbourne - Outer East': 646700,
    'Melbourne - South East': 776300,
    'Melbourne - West': 838500
  },
  {
    year: 2021,
    'Melbourne - Inner': 289200,
    'Melbourne - Inner East': 524700,
    'Melbourne - Inner South': 386400,
    'Melbourne - North East': 474200,
    'Melbourne - North West': 567800,
    'Melbourne - Outer East': 664100,
    'Melbourne - South East': 794800,
    'Melbourne - West': 858400
  }
];

export function PopulationAnalysis() {
  const [selectedYearFrom, setSelectedYearFrom] = useState<string>('2011');
  const [selectedYearTo, setSelectedYearTo] = useState<string>('2021');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [showFiltered, setShowFiltered] = useState(false);

  const years = mockPopulationData.map(d => d.year.toString());
  const areas = Object.keys(mockPopulationData[0]).filter(key => key !== 'year');

  // Calculate trend data for line chart
  const trendData: TrendData[] = useMemo(() => {
    return mockPopulationData.map((yearData, index) => {
      const totalPopulation = areas.reduce((sum, area) => sum + yearData[area as keyof PopulationData], 0);
      
      let percentageChange = 0;
      if (index > 0) {
        const prevTotal = areas.reduce((sum, area) => sum + mockPopulationData[index - 1][area as keyof PopulationData], 0);
        percentageChange = ((totalPopulation - prevTotal) / prevTotal) * 100;
      }
      
      return {
        year: yearData.year,
        percentageChange,
        totalPopulation
      };
    });
  }, [areas]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (!showFiltered) return mockPopulationData;
    
    const yearFromNum = parseInt(selectedYearFrom);
    const yearToNum = parseInt(selectedYearTo);
    
    return mockPopulationData.filter(d => d.year >= yearFromNum && d.year <= yearToNum);
  }, [selectedYearFrom, selectedYearTo, showFiltered]);

  const filteredTrendData = useMemo(() => {
    if (!showFiltered) return trendData;
    
    const yearFromNum = parseInt(selectedYearFrom);
    const yearToNum = parseInt(selectedYearTo);
    
    return trendData.filter(d => d.year >= yearFromNum && d.year <= yearToNum);
  }, [trendData, selectedYearFrom, selectedYearTo, showFiltered]);

  const handleApplyFilters = () => {
    setShowFiltered(true);
  };

  const handleResetFilters = () => {
    setShowFiltered(false);
    setSelectedYearFrom('2011');
    setSelectedYearTo('2021');
    setSelectedAreas([]);
  };

  // Chart colors for different areas
  const chartColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', 
    '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Melbourne CBD Population Analysis (2011-2021)
          </CardTitle>
          <CardDescription>
            Interactive visualization of population growth across Melbourne's Statistical Areas Level 4 (SA4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-2 block">From Year</label>
              <Select value={selectedYearFrom} onValueChange={setSelectedYearFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">To Year</label>
              <Select value={selectedYearTo} onValueChange={setSelectedYearTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button onClick={handleApplyFilters} className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
            
            <Button variant="outline" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
          
          {showFiltered && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                Filtered: {selectedYearFrom} - {selectedYearTo}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Estimated Resident Population by SA4 Areas</CardTitle>
          <CardDescription>
            Population distribution across Melbourne's Statistical Areas Level 4 (SA4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  label={{ 
                    value: 'Number of People', 
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
                  formatter={(value, name) => [
                    `${(value as number).toLocaleString()} people`, 
                    name
                  ]}
                  labelFormatter={(value) => `Year: ${value}`}
                />
                <Legend />
                {areas.map((area, index) => (
                  <Bar 
                    key={area}
                    dataKey={area} 
                    fill={chartColors[index % chartColors.length]}
                    name={area}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Population Growth Trend
          </CardTitle>
          <CardDescription>
            Percentage change in total Melbourne population year-over-year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  label={{ 
                    value: 'Percentage Change (%)', 
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
                  formatter={(value, name) => [
                    `${(value as number).toFixed(2)}%`, 
                    'Population Change'
                  ]}
                  labelFormatter={(value) => `Year: ${value}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="percentageChange" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    stroke: '#ffffff',
                    strokeWidth: 2, 
                    r: 6 
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: 'hsl(var(--primary))',
                    stroke: '#ffffff', 
                    strokeWidth: 3 
                  }}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Population (2021)</p>
                <p className="text-2xl font-semibold">
                  {(filteredData[filteredData.length - 1]?.['Melbourne - Inner'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - Inner East'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - Inner South'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - North East'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - North West'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - Outer East'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - South East'] + 
                    filteredData[filteredData.length - 1]?.['Melbourne - West'] || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Annual Growth</p>
                <p className="text-2xl font-semibold text-green-600">
                  {(filteredTrendData.reduce((sum, d) => sum + d.percentageChange, 0) / 
                    Math.max(filteredTrendData.length - 1, 1)).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Years Analyzed</p>
                <p className="text-2xl font-semibold text-blue-600">
                  {filteredData.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}