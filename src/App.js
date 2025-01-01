import React, { useEffect, useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, RadialBarChart, RadialBar } from "recharts";
import config from "./config";

function App() {
  const [data, setData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [bpmData, setBpmData] = useState([]);
  const [predData, setPredData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [filters, setFilters] = useState({ BPM: false, Pred: false, ECG: false });
  const [searchTerm, setSearchTerm] = useState("");
  const [ecgId, setEcgId] = useState("");
  const [bpmId, setBpmId] = useState("");
  const [predId, setPredId] = useState("");
  const [prevEcgId, setPrevEcgId] = useState("");
  const [prevBpmId, setPrevBpmId] = useState("");
  const [prevPredId, setPrevPredId] = useState("");
  const intervalRef = useRef(null);
  const sampleRate = 125; // Frecuencia de muestreo en Hz

  const fetchData = async (id, type, setDataCallback) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/registro/info?id=${id}&type=${type}`);
      const result = await response.json();
      const formattedData = result.map((value, index) => ({
        time: type === "BPM" ? index : index / sampleRate, // Calcular el tiempo en segundos para ECG y Pred
        value
      }));
      setDataCallback(formattedData);
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
    }
  };

  const fetchPredData = async (id) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/registro/info?id=${id}&type=Pred`);
      const result = await response.json();
  
      // Colores asignados a cada etiqueta
      const colors = {
        "!": "#8884d8",
        "F": "#82ca9d",
        "N": "#ffc658",
        "V": "#ff7300",
        "f": "#d0ed57"
      };
  
      const formattedPredData = Object.keys(result).map((key) => ({
        name: key,
        value: result[key],
        fill: colors[key] || "#cccccc" // Default color if key is not in colors
      }));
      
      setPredData(formattedPredData);
    } catch (error) {
      console.error("Error fetching Pred data:", error);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/listar_registros/info`);
      const result = await response.json();
      setRecords(result);
      setFilteredRecords(result);
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  const handleFetchData = () => {
    if (ecgId !== prevEcgId) {
      fetchData(ecgId, "ECG", (formattedData) => {
        setData(formattedData);
        setDisplayData(formattedData.slice(0, 1250)); // Mostrar los primeros 10 segundos (1250 muestras)
        setCurrentIndex(0);
        setElapsedTime(0);
      });
      setPrevEcgId(ecgId);
    }

    if (bpmId !== prevBpmId) {
      fetchData(bpmId, "BPM", setBpmData);
      setPrevBpmId(bpmId);
    }

    if (predId !== prevPredId) {
      fetchPredData(predId);
      setPrevPredId(predId);
    }

    fetchRecords();
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const newIndex = prevIndex + 1;
          setDisplayData(data.slice(newIndex, newIndex + 1250));
          setElapsedTime((newIndex + 1250) / sampleRate);
          return newIndex;
        });
      }, 1000 / sampleRate); // Mover un segundo cada segundo
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, data]);

  useEffect(() => {
    const activeFilters = Object.keys(filters).filter((key) => filters[key]);
    let filtered = records;

    if (activeFilters.length > 0) {
      filtered = filtered.filter((record) => activeFilters.includes(record.type));
    }

    if (searchTerm) {
      filtered = filtered.filter((record) =>
        record.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRecords(filtered);
  }, [filters, searchTerm, records]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleFilter = (type) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [type]: !prevFilters[type],
    }));
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const formatTime = (timeInSeconds) => {
    const ms = Math.floor((timeInSeconds % 1) * 1000);
    const seconds = Math.floor(timeInSeconds % 60);
    const minutes = Math.floor((timeInSeconds / 60) % 60);
    const hours = Math.floor(timeInSeconds / 3600);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(ms).padStart(3, '0')}`;
  };

  const totalDuration = data.length / sampleRate;
  const remainingTime = totalDuration - elapsedTime;

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Consultas Dinámicas</h1>
      <div>
        <input
          type="text"
          placeholder="ID ECG"
          value={ecgId}
          onChange={(e) => setEcgId(e.target.value)}
          style={{ margin: "10px", padding: "5px" }}
        />
        <input
          type="text"
          placeholder="ID BPM"
          value={bpmId}
          onChange={(e) => setBpmId(e.target.value)}
          style={{ margin: "10px", padding: "5px" }}
        />
        <input
          type="text"
          placeholder="ID Pred"
          value={predId}
          onChange={(e) => setPredId(e.target.value)}
          style={{ margin: "10px", padding: "5px" }}
        />
        <button onClick={handleFetchData} style={{ margin: "10px", padding: "5px" }}>
          Consultar
        </button>
      </div>
      <h1>Gráfico de Líneas con Recharts</h1>
      <button onClick={handlePlayPause}>{isPlaying ? "Pause" : "Play"}</button>
      <div>
        <p>Tiempo transcurrido: {formatTime(elapsedTime)}</p>
        <p>Tiempo restante: {formatTime(remainingTime)}</p>
      </div>
      <LineChart
        width={2000}
        height={700}
        data={displayData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -10 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          dot={false} // No mostrar puntos en la línea
        />
      </LineChart>
      <h1>Gráfico de Barras con Recharts</h1>
      <BarChart
        width={2000}
        height={250}
        data={bpmData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="time"
          label={{ value: 'Time (min)', position: 'insideBottomRight', offset: -10 }}
          domain={[0, bpmData.length - 1]}
          ticks={[0, bpmData.length - 1]}
          tickFormatter={(tick) => (tick / 60).toFixed(2)}
        />
        <YAxis />
        <Tooltip formatter={(value, name, props) => [`${value}`, `Time: ${(props.payload.time / 60).toFixed(2)} min`]} />
        <Legend />
        <Bar dataKey="value" fill="#82ca9d" />
      </BarChart>

      <h1>Gráfico Radial de Barras con Recharts</h1>
      <RadialBarChart
      width={610}
      height={600}
      cx={300}
      cy={250}
      innerRadius={30}
      outerRadius={250}
      barSize={20}
      data={predData}
    >
      <RadialBar
        minAngle={15}
        label={{ position: 'insideStart', fill: '#fff' }}
        background
        clockWise
        dataKey="value"
        // El color de la barra será el que se define en 'fill'
        isAnimationActive={false}
      />
      <Legend 
        iconSize={10} 
        layout="vertical" 
        verticalAlign="middle" 
        wrapperStyle={{ top: 0, left: 550, lineHeight: '24px' }} 
        payload={predData.map((entry) => ({
          value: `${entry.name}: ${entry.value}`,
          type: "square",
          id: entry.name,
          color: entry.fill // Usar el color especificado
        }))}
      />
      <Tooltip />
    </RadialBarChart>

      <h1>Lista de Registros</h1>
      <div>
        <button
          onClick={() => toggleFilter("BPM")}
          style={{ backgroundColor: filters.BPM ? "darkgray" : "lightgray" }}
        >
          {filters.BPM ? "Ocultar BPM" : "Mostrar BPM"}
        </button>
        <button
          onClick={() => toggleFilter("Pred")}
          style={{ backgroundColor: filters.Pred ? "darkgray" : "lightgray" }}
        >
          {filters.Pred ? "Ocultar Pred" : "Mostrar Pred"}
        </button>
        <button
          onClick={() => toggleFilter("ECG")}
          style={{ backgroundColor: filters.ECG ? "darkgray" : "lightgray" }}
        >
          {filters.ECG ? "Ocultar ECG" : "Mostrar ECG"}
        </button>
      </div>
      <div>
        <input
          type="text"
          placeholder="Buscar por nombre"
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ margin: "10px", padding: "5px" }}
        />
      </div>
      <table border="1" style={{ margin: "0 auto", width: "80%" }}>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Correo</th>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Tipo</th>
            <th>Tamaño</th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.map((record) => (
            <tr key={record._id}>
              <td>{record.full_name}</td>
              <td>{record.email}</td>
              <td>{record.created_date}</td>
              <td>{record.created_time}</td>
              <td>{record.type}</td>
              <td>{record.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ height: "200px" }}></div>
    </div>
  );
}

export default App;