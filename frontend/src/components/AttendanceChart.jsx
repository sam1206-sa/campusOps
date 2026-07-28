import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const AttendanceChart = ({ attendanceData }) => {
  if (!attendanceData || !attendanceData.bySubject) {
    return <div className="text-slate-400">No attendance data available.</div>;
  }

  const subjects = Object.keys(attendanceData.bySubject);
  const percentages = subjects.map(sub => {
    const data = attendanceData.bySubject[sub];
    return data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0;
  });

  const data = {
    labels: subjects,
    datasets: [
      {
        label: 'Attendance %',
        data: percentages,
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
        borderRadius: 8,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => ` Attendance: ${context.raw}%`
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value) => `${value}%`,
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="h-[220px] w-full">
      <Bar data={data} options={options} />
    </div>
  );
};

export default AttendanceChart;
