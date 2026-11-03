export function checkEligibility(profile, drive) {
  const reasons = [];
  if (!profile) return { eligible: false, reasons: ['Complete your student profile to check eligibility.'] };
  if (profile.cgpa < drive.minimumCGPA) reasons.push(`CGPA ${profile.cgpa.toFixed(2)} is below the required ${drive.minimumCGPA.toFixed(2)}.`);
  if (profile.backlogs > drive.maximumBacklogs) reasons.push(`${profile.backlogs} backlogs exceed the allowed ${drive.maximumBacklogs}.`);
  if (!drive.eligibleDepartments.includes(profile.department)) reasons.push(`${profile.department} is not an eligible department for this role.`);
  if (profile.graduationYear !== drive.graduationYear) reasons.push(`This drive is for the ${drive.graduationYear} graduating batch.`);
  return { eligible: reasons.length === 0, reasons };
}
