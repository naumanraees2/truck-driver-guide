/**
 * Client-side fallback HOS Simulation Engine.
 * Ensures the app functions smoothly even during cold starts or offline inspection.
 */

const LOGISTICS_HUBS = {
  'richmond, va': { lat: 37.5407, lng: -77.4360, name: 'Richmond, VA' },
  'newark, nj': { lat: 40.7357, lng: -74.1724, name: 'Newark, NJ' },
  'ontario, ca': { lat: 34.0633, lng: -117.6509, name: 'Ontario, CA' },
  'los angeles, ca': { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
  'dallas, tx': { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' },
  'chicago, il': { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL' },
  'gary, in': { lat: 41.5934, lng: -87.3464, name: 'Gary, IN' },
  'miami, fl': { lat: 25.7617, lng: -80.1918, name: 'Miami, FL' },
  'seattle, wa': { lat: 47.6062, lng: -122.3321, name: 'Seattle, WA' },
  'tacoma, wa': { lat: 47.2529, lng: -122.4443, name: 'Tacoma, WA' },
  'salt lake city, ut': { lat: 40.7608, lng: -111.8910, name: 'Salt Lake City, UT' },
  'atlanta, ga': { lat: 33.7490, lng: -84.3880, name: 'Atlanta, GA' },
};

function lookupCoord(query, defaultCoord) {
  const q = (query || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(LOGISTICS_HUBS)) {
    if (q.includes(key) || key.includes(q)) return val;
  }
  return defaultCoord;
}

export function simulateTripClient(inputs) {
  const current_loc = lookupCoord(inputs.current_location, { lat: 37.5407, lng: -77.4360, name: inputs.current_location });
  const pickup_loc = lookupCoord(inputs.pickup_location, { lat: 37.5407, lng: -77.4360, name: inputs.pickup_location });
  const dropoff_loc = lookupCoord(inputs.dropoff_location, { lat: 40.7357, lng: -74.1724, name: inputs.dropoff_location });

  const waypoints = [
    { ...current_loc, role: 'current', label: `Current: ${inputs.current_location}` },
    { ...pickup_loc, role: 'pickup', label: `Pickup: ${inputs.pickup_location}` },
    { ...dropoff_loc, role: 'dropoff', label: `Dropoff: ${inputs.dropoff_location}` }
  ];

  // Approximate distance
  const dx = dropoff_loc.lng - pickup_loc.lng;
  const dy = dropoff_loc.lat - pickup_loc.lat;
  const straightDist = Math.sqrt(dx * dx + dy * dy) * 69.0;
  const distance_miles = Math.max(25, Math.round(straightDist * 1.25));
  const driving_hours = parseFloat((distance_miles / 55.0).toFixed(2));

  // Coordinates line
  const coordinates = [
    [current_loc.lat, current_loc.lng],
    [pickup_loc.lat, pickup_loc.lng],
    [(pickup_loc.lat + dropoff_loc.lat) / 2 + 0.1, (pickup_loc.lng + dropoff_loc.lng) / 2],
    [dropoff_loc.lat, dropoff_loc.lng]
  ];

  const stops = [
    {
      type: 'pickup',
      name: 'Pickup / Shipper Facility',
      location: inputs.pickup_location,
      lat: pickup_loc.lat,
      lng: pickup_loc.lng,
      duration_hours: 1.0,
      eta: 'Day 1 06:15',
      description: 'Cargo loading and manifest verification (1.0 hr On-Duty).'
    }
  ];

  if (distance_miles > 400) {
    stops.push({
      type: 'break_30m',
      name: '30-Minute Mandatory Rest Break',
      location: 'Rest Area / Travel Center',
      lat: (pickup_loc.lat + dropoff_loc.lat) / 2,
      lng: (pickup_loc.lng + dropoff_loc.lng) / 2,
      duration_hours: 0.5,
      eta: 'Day 1 14:15',
      description: 'FMCSA 8-hour driving interruption: Mandatory 30-min break.'
    });
  }

  if (distance_miles >= 850) {
    stops.push({
      type: 'fuel_stop',
      name: 'Mandatory Fueling Stop',
      location: 'Interstate Travel Plaza',
      lat: (pickup_loc.lat + dropoff_loc.lat) / 2 + 0.05,
      lng: (pickup_loc.lng + dropoff_loc.lng) / 2 + 0.05,
      duration_hours: 0.5,
      eta: 'Day 1 18:00',
      description: 'Commercial vehicle refueling (1,000-mile requirement).'
    });
  }

  if (driving_hours > 11.0) {
    stops.push({
      type: 'rest_10h',
      name: '10-Hour Daily Sleeper Berth Reset',
      location: 'Commercial Truck Stop Haven',
      lat: (pickup_loc.lat + dropoff_loc.lat) / 2 - 0.05,
      lng: (pickup_loc.lng + dropoff_loc.lng) / 2 - 0.05,
      duration_hours: 10.0,
      eta: 'Day 1 20:30',
      description: 'HOS 11h limit reached: 10-hour mandatory sleeper berth.'
    });
  }

  stops.push({
    type: 'dropoff',
    name: 'Dropoff / Receiver Facility',
    location: inputs.dropoff_location,
    lat: dropoff_loc.lat,
    lng: dropoff_loc.lng,
    duration_hours: 1.0,
    eta: driving_hours > 11 ? 'Day 2 12:00' : 'Day 1 16:30',
    description: 'Cargo unloading and consignee sign-off (1.0 hr On-Duty).'
  });

  const numDays = driving_hours > 11.0 ? Math.ceil(driving_hours / 10.5) : 1;
  const daily_logs = [];

  for (let d = 1; d <= numDays; d++) {
    const isFirst = d === 1;
    const isLast = d === numDays;
    const dayDriving = isFirst && numDays > 1 ? 10.5 : (isLast && numDays > 1 ? parseFloat((driving_hours - 10.5 * (numDays - 1)).toFixed(2)) : Math.min(driving_hours, 11.0));
    const onDuty = (isFirst ? 1.25 : 0) + (isLast ? 1.25 : 0) + (distance_miles >= 850 && isFirst ? 0.5 : 0);
    const sb = numDays > 1 && !isLast ? 10.0 : (isLast ? 4.0 : 0);
    const off = parseFloat((24.0 - dayDriving - onDuty - sb).toFixed(2));

    const step_points = [
      { hour: 0, status_index: 0 },
      { hour: 6, status_index: 0 },
      { hour: 6, status_index: 3 },
      { hour: 7.25, status_index: 3 },
      { hour: 7.25, status_index: 2 },
      { hour: 7.25 + dayDriving, status_index: 2 },
      { hour: 7.25 + dayDriving, status_index: 3 },
      { hour: 7.25 + dayDriving + (isLast ? 1.25 : 0.5), status_index: 3 },
      { hour: 7.25 + dayDriving + (isLast ? 1.25 : 0.5), status_index: sb > 0 ? 1 : 0 },
      { hour: 24, status_index: sb > 0 ? 1 : 0 }
    ];

    daily_logs.push({
      day_number: d,
      date: `09/${String(9 + d).padStart(2, '0')}/2026`,
      carrier_name: inputs.carrier_name || "John Doe's Transportation",
      carrier_address: inputs.carrier_address || 'Washington, D.C.',
      driver_name: inputs.driver_name || 'John E. Doe',
      truck_number: inputs.truck_number || '123',
      trailer_number: inputs.trailer_number || '20544',
      shipping_doc: inputs.shipping_doc || 'BOL-101601',
      total_miles_driving_today: Math.round(distance_miles / numDays),
      hours_summary: {
        off_duty: Math.max(0, off),
        sleeper_berth: sb,
        driving: dayDriving,
        on_duty_not_driving: onDuty,
        total: 24.0
      },
      recap: {
        on_duty_today: parseFloat((dayDriving + onDuty).toFixed(2)),
        total_cycle_hours_used: parseFloat((inputs.current_cycle_used + dayDriving + onDuty).toFixed(2)),
        cycle_hours_available: Math.max(0, parseFloat((70.0 - inputs.current_cycle_used - dayDriving - onDuty).toFixed(2)))
      },
      step_points,
      remarks: [
        { hour: 6.0, time_str: '06:00', location: inputs.current_location, status: 'ON', description: 'Pre-trip vehicle inspection' },
        { hour: 6.25, time_str: '06:15', location: inputs.pickup_location, status: 'ON', description: 'Shipper cargo loading' },
        { hour: 7.25, time_str: '07:15', location: inputs.pickup_location, status: 'D', description: 'Depart shipper en-route' },
        { hour: 7.25 + dayDriving, time_str: '16:30', location: inputs.dropoff_location, status: 'ON', description: 'Receiver delivery discharge' }
      ]
    });
  }

  const route_instructions = [
    {
      step_number: 1,
      type: 'inspect',
      title: 'Pre-Trip Inspection & Dispatch Verification',
      location: inputs.current_location,
      distance_miles: 0,
      duration: '15 min',
      duty_status: 'ON',
      instruction: `Conduct pre-trip vehicle walkaround at ${inputs.current_location} per 49 CFR § 396.11.`
    },
    {
      step_number: 2,
      type: 'pickup',
      title: 'Shipper Facility Arrival & Loading',
      location: inputs.pickup_location,
      distance_miles: 0,
      duration: '1.0 hr',
      duty_status: 'ON',
      instruction: `Check in at shipper in ${inputs.pickup_location}. Back into dock, load cargo, seal doors, and sign BOL.`
    },
    {
      step_number: 3,
      type: 'drive',
      title: `Main Highway Transit to ${inputs.dropoff_location}`,
      location: `Commercial Freight Highway (${distance_miles} mi)`,
      distance_miles: distance_miles,
      duration: `${driving_hours} hrs`,
      duty_status: 'D',
      instruction: `Follow primary interstate corridor. Observe truck speed limits and monitor gross axle weights.`
    },
    {
      step_number: 4,
      type: 'dropoff',
      title: 'Receiver Facility Arrival & Cargo Discharge',
      location: inputs.dropoff_location,
      distance_miles: distance_miles,
      duration: '1.0 hr',
      duty_status: 'ON',
      instruction: `Discharge cargo at consignee dock in ${inputs.dropoff_location}. Obtain signed Bill of Lading receipt.`
    },
    {
      step_number: 5,
      type: 'inspect',
      title: 'Post-Trip DVIR Inspection & Shift Closeout',
      location: inputs.dropoff_location,
      distance_miles: distance_miles,
      duration: '15 min',
      duty_status: 'ON',
      instruction: `Complete post-trip vehicle inspection report (DVIR). Certify equipment safety and log Off-Duty.`
    }
  ];

  return {
    inputs,
    waypoints,
    route: {
      distance_miles,
      driving_hours,
      coordinates,
      legs: [{ from_name: inputs.current_location, to_name: inputs.dropoff_location, distance_miles, duration_hours: driving_hours }]
    },
    stops,
    stats: {
      total_distance_miles: distance_miles,
      total_driving_hours: driving_hours,
      total_on_duty_hours: numDays > 1 ? 4.5 : 2.5,
      total_sleeper_hours: numDays > 1 ? 10.0 : 0.0,
      total_off_duty_hours: parseFloat((24.0 * numDays - driving_hours - 2.5).toFixed(2)),
      total_trip_hours: parseFloat((driving_hours + 2.5).toFixed(2)),
      fuel_stops_count: distance_miles >= 850 ? 1 : 0,
      rest_breaks_count: distance_miles > 400 ? 1 : 0,
      sleeper_stops_count: driving_hours > 11 ? 1 : 0,
      restarts_count: 0,
      cycle_hours_remaining: Math.max(0, parseFloat((70.0 - inputs.current_cycle_used - driving_hours).toFixed(1)))
    },
    route_instructions,
    daily_logs
  };
}
