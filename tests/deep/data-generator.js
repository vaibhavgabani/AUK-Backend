const FIRST_NAMES = [
  'Aarav', 'Riya', 'Dhruv', 'Ananya', 'Kabir', 'Meera', 'Vihaan', 'Isha', 'Aditya', 'Diya',
  'Arjun', 'Sanya', 'Rohan', 'Pooja', 'Dev', 'Neha', 'Yash', 'Kavya', 'Rahul', 'Anika',
  'Oliver', 'Emma', 'George', 'Amelia', 'Harry', 'Isla', 'Jack', 'Ava', 'Jacob', 'Mia'
];

const LAST_NAMES = [
  'Mehta', 'Shah', 'Patel', 'Desai', 'Joshi', 'Trivedi', 'Sharma', 'Verma', 'Kapoor', 'Gupta',
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Patel', 'Wright'
];

const VENUES = [
  'London Exhibition Centre', 'Manchester Victoria Hall', 'Birmingham NEC Arena',
  'Edinburgh Central Pavilion', 'Bristol Harbor Centre', 'Leeds Exhibition Plaza',
  'Glasgow City Hall', 'Liverpool Waterfront Arena', 'Cardiff International Centre', 'Oxford University Suite'
];

const CITIES = ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Leeds', 'Glasgow', 'Liverpool', 'Cardiff', 'Oxford'];

const EXPENSE_TITLES = [
  'Venue Parking & Security',
  'Staff Catering & Refreshments',
  'Stage & Audio Equipment Hire',
  'Printing & Signage Materials',
  'Logistics & Freight Transport',
  'Emergency Medical Supplies',
  'Travel & Accommodation Reimbursement',
  'Lighting & Visual Production',
];

function pseudoRandom(seed) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generateRealisticManagerData(index) {
  const seed = index + 100;
  const firstName = FIRST_NAMES[Math.floor(pseudoRandom(seed) * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(pseudoRandom(seed + 1) * LAST_NAMES.length)];
  const name = `${lastName} ${firstName}`;
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const email = `${cleanFirst}.${cleanLast}.mgr${String(index).padStart(4, '0')}@example.test`;
  const phone = `07${String(100000000 + index).slice(0, 9)}`;

  return { name, email, password: 'ManagerPassword123!', phone };
}

export function generateRealisticGigData(index) {
  const seed = index + 200;
  const firstName = FIRST_NAMES[Math.floor(pseudoRandom(seed) * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(pseudoRandom(seed + 1) * LAST_NAMES.length)];
  const name = `${lastName} ${firstName}`;
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const email = `${cleanFirst}.${cleanLast}.gig${String(index).padStart(4, '0')}@example.test`;
  const phone = `07${String(200000000 + index).slice(0, 9)}`;
  const payRate = (12 + (index % 25)).toFixed(2);

  return { name, email, phone, payRate };
}

export function generateRealisticEventData(index, managerId) {
  const seed = index + 300;
  const city = CITIES[index % CITIES.length];
  const venue = VENUES[index % VENUES.length];
  const name = `${city} Operations Summit ${index + 1}`;

  // Deterministically vary dates (past, ongoing, future)
  const baseOffsetDays = (index % 60) - 30; // -30 days to +30 days
  const startDate = new Date(Date.now() + baseOffsetDays * 86400000);
  const durationHours = 4 + (index % 8); // 4 to 11 hours
  const endDate = new Date(startDate.getTime() + durationHours * 3600000);

  return {
    managerId,
    name,
    place: venue,
    startDatetime: startDate.toISOString(),
    endDatetime: endDate.toISOString(),
  };
}

export function generateRealisticExpenseData(index, eventId) {
  const title = `${EXPENSE_TITLES[index % EXPENSE_TITLES.length]} #${index + 1}`;
  const amount = parseFloat((25.5 + (index % 475)).toFixed(2));
  const currency = index % 10 === 0 ? 'EUR' : 'GBP';

  return {
    eventId,
    title,
    amount,
    currency,
  };
}
