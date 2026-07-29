import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const exportTimetableToPDF = async (elementId, filename = 'timetable.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(filename);
  } catch (err) {
    console.error('Error generating PDF:', err);
    // Simple print fallback
    window.print();
  }
};
