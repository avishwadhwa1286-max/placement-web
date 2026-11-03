import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import StudentProfile from '../models/StudentProfile.js';
import Company from '../models/Company.js';
import PlacementDrive from '../models/PlacementDrive.js';
import Application from '../models/Application.js';
import Announcement from '../models/Announcement.js';

const run = async () => {
  await connectDB();
  await Promise.all([Application.deleteMany({}), Announcement.deleteMany({}), PlacementDrive.deleteMany({}), StudentProfile.deleteMany({}), User.deleteMany({}), Company.deleteMany({})]);
  const password = await bcrypt.hash('Campus@2026', 12);
  const admin = await User.create({ name: 'Placement Office', email: process.env.ADMIN_EMAIL || 'placement.admin@skit.ac.in', password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Campus@2026', 12), role: 'admin' });
  const companyData = [
    ['Aster Digital', 'Product engineering and cloud services for growing businesses.', 'https://asterdigital.example', 'Bengaluru', 'Technology', 'talent@asterdigital.example'],
    ['Northstar Analytics', 'Data platforms and decision tools for Indian enterprises.', 'https://northstaranalytics.example', 'Pune', 'Analytics', 'careers@northstaranalytics.example'],
    ['Meridian Systems', 'Embedded systems and connected device engineering.', 'https://meridiansystems.example', 'Hyderabad', 'Electronics', 'campus@meridiansystems.example'],
    ['BlueKite Mobility', 'Building practical mobility and electric vehicle solutions.', 'https://bluekitemobility.example', 'Chennai', 'Automotive', 'people@bluekitemobility.example'],
    ['Cedar Infrastructure', 'Engineering, design and project delivery across India.', 'https://cedarinfrastructure.example', 'Delhi NCR', 'Infrastructure', 'earlycareers@cedarinfrastructure.example'],
    ['Kaveri Consumer Labs', 'Digital products and operations for consumer brands.', 'https://kavericonsumer.example', 'Mumbai', 'Consumer Technology', 'campus@kavericonsumer.example']
  ];
  const companies = await Company.insertMany(companyData.map(([name, description, website, location, industry, contactEmail], i) => ({ name, description, website, location, industry, contactEmail, contactName: ['Riya Menon', 'Arjun Shah', 'Pooja Iyer', 'Kunal Rao', 'Neha Bansal', 'Sana Khan'][i] })));
  const recruiterSpecs = [[0, 'Riya Menon', 'recruiter@asterdigital.example'], [1, 'Arjun Shah', 'recruiter@northstaranalytics.example'], [2, 'Pooja Iyer', 'recruiter@meridiansystems.example']];
  await User.insertMany(recruiterSpecs.map(([i, name, email]) => ({ name, email, password, role: 'recruiter', companyId: companies[i]._id })));

  const studentNames = ['Aarav Sharma', 'Ananya Nair', 'Ishaan Gupta', 'Meera Joshi', 'Kabir Verma', 'Diya Reddy', 'Rohan Kulkarni', 'Saanvi Patel', 'Aditya Rao', 'Kavya Menon', 'Vihaan Singh', 'Nisha Das', 'Arjun Kapoor', 'Tara Iyer', 'Dev Malhotra', 'Mira Shah', 'Reyansh Kumar', 'Aditi Bose'];
  const departments = ['CSE', 'IT', 'ECE', 'Mechanical', 'Civil', 'Electrical'];
  const records = studentNames.map((name, i) => ({ name, email: `student${String(i + 1).padStart(2, '0')}@skit.ac.in`, password, role: 'student' }));
  const students = await User.insertMany(records);
  const profiles = await StudentProfile.insertMany(students.map((user, i) => ({
    userId: user._id, rollNumber: `SKIT${String(2023 + (i % 2))}${String(i + 1).padStart(3, '0')}`,
    department: departments[i % departments.length], course: 'B.Tech', semester: 7,
    graduationYear: i === 16 ? 2028 : 2027, cgpa: [8.6, 7.8, 8.1, 9.0, 6.4, 7.2, 8.8, 7.6, 6.9, 8.3, 7.1, 9.2, 6.7, 8.0, 7.4, 8.7, 8.1, 7.9][i],
    backlogs: [0, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0][i], phone: `98${String(21000000 + i).slice(-8)}`
  })));
  const future = days => new Date(Date.now() + days * 86400000);
  const driveData = [
    [0, 'Graduate Software Engineer', 8.0, 0, ['CSE', 'IT'], 2027, 18, 7.2],
    [1, 'Associate Data Analyst', 7.0, 1, ['CSE', 'IT', 'ECE'], 2027, 13, 6.0],
    [2, 'Embedded Systems Engineer', 7.0, 1, ['ECE', 'Electrical'], 2027, 21, 6.8],
    [3, 'Graduate Trainee — EV Systems', 6.5, 2, ['Mechanical', 'Electrical', 'ECE'], 2027, 27, 5.8],
    [4, 'Graduate Engineer — Projects', 6.0, 2, ['Civil', 'Mechanical'], 2027, 34, 5.5],
    [5, 'Product Operations Associate', 6.5, 1, ['CSE', 'IT', 'Electrical'], 2027, 40, 6.4],
    [0, 'Cloud Support Associate', 7.5, 0, ['CSE', 'IT', 'ECE'], 2028, 47, 6.2]
  ];
  const drives = await PlacementDrive.insertMany(driveData.map(([company, jobRole, minimumCGPA, maximumBacklogs, eligibleDepartments, graduationYear, deadlineDays, packageLpa], i) => ({
    companyId: companies[company]._id, jobRole, description: [
      'Work with a product engineering team on web services, APIs and cloud deployments. Includes a structured eight-week induction.',
      'Support customer data projects through SQL analysis, dashboard development and clear written insights.',
      'Develop and validate firmware for connected devices alongside hardware and test engineering teams.',
      'Join vehicle systems teams working on component testing, quality processes and EV integration.',
      'Assist project teams with estimation, site coordination and engineering documentation.',
      'Coordinate product operations and reporting across customer and internal teams.',
      'Help customers troubleshoot cloud workloads while learning deployment and observability practices.'
    ][i], package: packageLpa, location: companies[company].location, minimumCGPA, maximumBacklogs, eligibleDepartments, graduationYear, deadline: future(deadlineDays), status: 'Open'
  })));

  const eligibleProfiles = (drive) => profiles.filter(p => p.graduationYear === drive.graduationYear && p.cgpa >= drive.minimumCGPA && p.backlogs <= drive.maximumBacklogs && drive.eligibleDepartments.includes(p.department));
  const applications = [];
  const statuses = ['Applied', 'Under Review', 'Shortlisted', 'Selected', 'Rejected'];
  let serial = 0;
  for (const drive of drives.slice(0, 6)) {
    const candidates = eligibleProfiles(drive);
    for (const profile of candidates.slice(0, 3)) {
      applications.push({ studentId: profile.userId, driveId: drive._id, companyId: drive.companyId, status: statuses[serial % statuses.length], appliedAt: new Date(Date.now() - (serial + 1) * 86400000), remarks: serial % 3 === 2 ? 'Reviewed by the campus hiring team.' : '' }); serial++;
    }
  }
  if (applications.length) await Application.insertMany(applications);
  await Announcement.insertMany([
    { title: 'Welcome to the 2026–27 placement season', body: 'Keep your profile and contact information current. Recruiter sessions and application deadlines will be posted here throughout the term.', audience: 'all', postedBy: admin._id },
    { title: 'Resume review hours', body: 'The Placement Office will host resume review hours every Wednesday from 2:00–4:00 PM in Seminar Room 204. Bring a digital copy of your latest resume.', audience: 'students', postedBy: admin._id },
    { title: 'Recruiter portal orientation', body: 'Recruiter accounts can publish drives and review their own applicants from the company dashboard. Contact the Placement Office if your account needs updating.', audience: 'recruiters', postedBy: admin._id }
  ]);
  console.log(`Seed complete: 1 admin, ${recruiterSpecs.length} recruiters, ${students.length} students, ${companies.length} companies, ${drives.length} drives, ${applications.length} applications.`);
  await (await import('mongoose')).default.disconnect();
};
run().catch(async error => { console.error(error); await (await import('mongoose')).default.disconnect().catch(() => {}); process.exit(1); });
