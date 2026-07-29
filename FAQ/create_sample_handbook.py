"""
create_sample_handbook.py

Generates a realistic multi-page 'handbook.pdf' file for testing the
Campus FAQ Agent RAG system using ReportLab.
"""

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_handbook_pdf(output_filename="handbook.pdf"):
    """Creates a 5-page sample college handbook PDF with official policies."""
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Title'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1e1b4b'),
        alignment=1,
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#312e81'),
        spaceBefore=12,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor('#1f2937'),
        spaceAfter=10
    )

    story = []

    # PAGE 1: COVER & GRADING POLICY
    story.append(Paragraph("OFFICIAL COLLEGE STUDENT HANDBOOK", title_style))
    story.append(Paragraph("<b>Academic Year 2026 - 2027</b>", ParagraphStyle('Sub', parent=title_style, fontSize=14, textColor=colors.HexColor('#4f46e5'))))
    story.append(Spacer(1, 20))
    story.append(Paragraph("SECTION 1: ACADEMIC POLICIES & GRADING SYSTEM", h1_style))
    story.append(Paragraph(
        "<b>1.1 Grading Scale & Grade Point Average (GPA):</b><br/>"
        "The college operates on a standard 4.0 grading scale as follows:<br/>"
        "• <b>Grade A (90% - 100%):</b> 4.0 Grade Points — Outstanding Achievement.<br/>"
        "• <b>Grade B (80% - 89%):</b> 3.0 Grade Points — Above Average Performance.<br/>"
        "• <b>Grade C (70% - 79%):</b> 2.0 Grade Points — Satisfactory Completion.<br/>"
        "• <b>Grade D (60% - 69%):</b> 1.0 Grade Point — Minimum Passing Grade.<br/>"
        "• <b>Grade F (Below 60%):</b> 0.0 Grade Points — Failure to meet requirements.<br/>"
        "Cumulative Grade Point Average (CGPA) is calculated at the end of each semester by dividing total quality points earned by total credit hours attempted.",
        body_style
    ))
    story.append(Paragraph(
        "<b>1.2 Course Grade Appeal Process:</b><br/>"
        "Students who believe a final course grade was assigned erroneously or unfairly may initiate a formal grade appeal.<br/>"
        "<b>Step 1: Informal Resolution:</b> The student must discuss the grade with the course instructor within 10 calendar days of grade release.<br/>"
        "<b>Step 2: Formal Written Appeal:</b> If unresolved, the student may submit a written appeal form to the Department Head within 15 calendar days.<br/>"
        "<b>Step 3: Appeals Committee Review:</b> The Academic Appeals Committee reviews submitted evidence and issues a final, binding decision within 30 days.",
        body_style
    ))
    story.append(PageBreak())

    # PAGE 2: ATTENDANCE & EXAMINATION POLICIES
    story.append(Paragraph("SECTION 2: ATTENDANCE & EXAMINATION RULES", h1_style))
    story.append(Paragraph(
        "<b>2.1 Attendance Policy & Allowed Absences:</b><br/>"
        "Regular classroom attendance is mandatory for academic progress.<br/>"
        "• Students are permitted a maximum of <b>3 unexcused absences</b> per 3-credit hour course per semester.<br/>"
        "• Exceeding 3 unexcused absences results in an automatic Grade 'F' due to non-attendance.<br/>"
        "• <b>Excused Absences:</b> Absences due to medical emergencies, official intercollegiate athletics, or jury duty are excused if official documentation is submitted to the Dean of Students within 3 business days of return.",
        body_style
    ))
    story.append(Paragraph(
        "<b>2.2 Make-up Examination Policy:</b><br/>"
        "Make-up midterms or final exams are granted only for documented medical or family emergencies approved by the Department Chair. Students must notify their instructor prior to the start of the scheduled exam.",
        body_style
    ))
    story.append(PageBreak())

    # PAGE 3: CAMPUS FACILITIES & LIBRARY
    story.append(Paragraph("SECTION 3: CAMPUS FACILITIES & LIBRARY SERVICES", h1_style))
    story.append(Paragraph(
        "<b>3.1 University Library Hours & Services:</b><br/>"
        "The Main Campus Library provides study spaces, digital research databases, and computing services.<br/>"
        "• <b>Regular Operating Hours:</b> Monday through Thursday: 7:30 AM – 11:00 PM | Friday: 7:30 AM – 8:00 PM | Saturday & Sunday: 10:00 AM – 6:00 PM.<br/>"
        "• <b>24/7 Final Exam Study Center:</b> During midterms and final examination weeks, the 1st Floor Study Commons remains open 24 hours daily.<br/>"
        "• <b>Book Borrowing Limits:</b> Undergraduate students may borrow up to 10 books for 21 days. Graduate students may borrow up to 25 books for 60 days.",
        body_style
    ))
    story.append(Paragraph(
        "<b>3.2 Private Study Room Reservations:</b><br/>"
        "Individual and group study rooms (Rooms L201 – L215) can be reserved online through the Student Portal up to 7 days in advance for reservations of up to 3 hours per day.",
        body_style
    ))
    story.append(PageBreak())

    # PAGE 4: TUITION FEES & REFUNDS
    story.append(Paragraph("SECTION 4: TUITION FEES & REFUND SCHEDULE", h1_style))
    story.append(Paragraph(
        "<b>4.1 Tuition Payment Deadlines & Late Fees:</b><br/>"
        "Tuition and term fees must be settled in full by 5:00 PM on the first official day of classes each semester.<br/>"
        "A late fee of <b>$150</b> is assessed on accounts with outstanding balances after the official payment deadline. Registration holds are placed on delinquent student accounts.",
        body_style
    ))
    story.append(Paragraph(
        "<b>4.2 Official Course Drop Refund Schedule:</b><br/>"
        "Students dropping courses during the official Add/Drop window receive tuition credit according to the following schedule:<br/>"
        "• <b>Drop prior to Week 1 ending:</b> 100% Tuition Refund.<br/>"
        "• <b>Drop during Week 2:</b> 75% Tuition Refund.<br/>"
        "• <b>Drop during Week 3:</b> 50% Tuition Refund.<br/>"
        "• <b>Drop after Week 3:</b> 0% Tuition Refund (No refund available).",
        body_style
    ))
    story.append(PageBreak())

    # PAGE 5: CODE OF CONDUCT & HOUSING
    story.append(Paragraph("SECTION 5: CODE OF CONDUCT & STUDENT HOUSING", h1_style))
    story.append(Paragraph(
        "<b>5.1 Academic Integrity & Plagiarism Policy:</b><br/>"
        "Academic dishonesty, including plagiarism, cheating on examinations, submitting unoriginal work, or unauthorized AI generation, is strictly prohibited.<br/>"
        "First offenses carry a failing grade (0%) on the assignment and formal warning letter. Second offenses result in immediate suspension or expulsion from the university.",
        body_style
    ))
    story.append(Paragraph(
        "<b>5.2 Student Housing & Residence Quiet Hours:</b><br/>"
        "All campus residence halls maintain quiet hours to promote an environment conducive to study and sleep.<br/>"
        "• <b>Quiet Hours:</b> Sunday through Thursday: 10:00 PM – 7:00 AM | Friday & Saturday: Midnight – 8:00 AM.<br/>"
        "• <b>Guest Policy:</b> Overnight guests must be registered at the Residence Hall front desk at least 24 hours prior to arrival.",
        body_style
    ))

    doc.build(story)
    print(f"Successfully generated sample handbook PDF: '{output_filename}' (5 Pages)")


if __name__ == "__main__":
    generate_handbook_pdf()
