import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Input } from './components/ui/Input';
import { Button } from './components/ui/Button';

interface WeatherData {
  city: string;
  data: {
    dt_txt: string;
    temp: number;
    pressure: number;
    humidity: number;
    wind: number;
  }[];
}

interface WeatherItem {
  dt_txt: string;
  main: {
    temp: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
}

const WeatherApp: React.FC = () => {
  const [city, setCity] = useState('');
  const [cityData, setCityData] = useState<WeatherData | null>(null); // Храним данные только для одного города
  const [metric, setMetric] = useState('temp');
  const [granularity, setGranularity] = useState('3h');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;

  const fetchWeatherData = async (cityName: string, granularity: string) => {
    if (!API_KEY) {
      setError('API key is not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const geoRes = await axios.get(
        `https://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_KEY}`
      );

      if (!geoRes.data.length) {
        throw new Error('City not found');
      }

      const { lat, lon } = geoRes.data[0];
  
      const weatherRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
      );

      let data = weatherRes.data.list.map((item: WeatherItem) => ({
        dt_txt: item.dt_txt,
        temp: item.main.temp,
        pressure: item.main.pressure,
        humidity: item.main.humidity,
        wind: item.wind.speed,
      }));

      // Сортировка данных по временным меткам
      data.sort((a: WeatherData['data'][0], b: WeatherData['data'][0]) => 
        new Date(a.dt_txt).getTime() - new Date(b.dt_txt).getTime()
      );

      if (granularity === 'day') {
        // Группировка данных по дням и вычисление средних значений
        const groupedData: { [key: string]: any } = {};
        data.forEach((item: WeatherData['data'][0]) => {
          const date = item.dt_txt.split(' ')[0];
          if (!groupedData[date]) {
            groupedData[date] = { ...item, count: 1 };
          } else {
            groupedData[date].temp += item.temp;
            groupedData[date].pressure += item.pressure;
            groupedData[date].humidity += item.humidity;
            groupedData[date].wind += item.wind;
            groupedData[date].count += 1;
          }
        });

        data = Object.keys(groupedData).map((date) => ({
          dt_txt: date,
          temp: groupedData[date].temp / groupedData[date].count,
          pressure: groupedData[date].pressure / groupedData[date].count,
          humidity: groupedData[date].humidity / groupedData[date].count,
          wind: groupedData[date].wind / groupedData[date].count,
        }));
      }

      // Сохраняем данные только для одного города
      setCityData({ city: cityName, data });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch weather data');
      console.error('Error fetching weather data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCitySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (city.trim()) {
      fetchWeatherData(city.trim(), granularity);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCity(e.target.value);
  };

  const handleMetricChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMetric(e.target.value);
  };

  const handleGranularityChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newGranularity = e.target.value;
    setGranularity(newGranularity);

    if (city.trim()) {
      fetchWeatherData(city.trim(), newGranularity);
    }
  };

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow">
          <p>{`Date: ${data.dt_txt}`}</p>
          <p>{`Temperature: ${data.temp}°C`}</p>
          <p>{`Pressure: ${data.pressure} hPa`}</p>
          <p>{`Humidity: ${data.humidity}%`}</p>
          <p>{`Wind Speed: ${data.wind} m/s`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Weather Forecast</h1>
      
      <form onSubmit={handleCitySubmit} className="flex gap-2 mb-4">
        <Input 
          value={city} 
          onChange={handleInputChange}
          placeholder="Enter city"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Get Forecast'}
        </Button>
      </form>

      <div className="mb-4">
        <label htmlFor="metric" className="mr-2">Select Metric:</label>
        <select id="metric" value={metric} onChange={handleMetricChange} className="border rounded-md p-2">
          <option value="temp">Temperature</option>
          <option value="pressure">Pressure</option>
          <option value="humidity">Humidity</option>
          <option value="wind">Wind Speed</option>
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="granularity" className="mr-2">Select Granularity:</label>
        <select id="granularity" value={granularity} onChange={handleGranularityChange} className="border rounded-md p-2">
          <option value="3h">3 Hours</option>
          <option value="day">Day</option>
        </select>
      </div>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      {cityData && (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dt_txt" />
            <YAxis />
            <Tooltip content={renderCustomTooltip} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={metric} 
              data={cityData.data} 
              name={cityData.city} 
              stroke="hsl(210, 70%, 50%)" 
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default WeatherApp;