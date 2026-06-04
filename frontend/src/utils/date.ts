/**
 * Calculates the age of a person in years given their date of birth string.
 * @param dobString - Date of birth in YYYY-MM-DD format
 */
export const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 0;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

/**
 * Returns a rough Date of Birth (Jan 1st of the birth year) given a patient's age.
 * @param age - Patient age in years
 */
export const calculateDobFromAge = (age: number): string => {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - age;
  return `${birthYear}-01-01`;
};
