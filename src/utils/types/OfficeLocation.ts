/**
 * Office geofence. Attendance can only be marked inside this circle.
 * Office: M.RATNA, Signh Rd, Nadakkave, Kozhikode 673011 (Plus Code 7QCG+XP)
 * Coordinates: 11°16'20.7"N 75°46'36.7"E
 */
export const OFFICE = {
  name: "Office, Nadakkave",
  lat: 11.2724167,
  lng: 75.7768611,
  
  /** allowed distance from the office point, in metres (1 km; use 500 for 500 m) */
  radiusMeters: 100,
  /** reject GPS readings less accurate than this (phones are usually under 50 m, laptops 50-500 m) */
  maxAccuracyMeters: 500,
};

export type LocationFix = {
  lat: number;
  lng: number;
  accuracy: number; // metres
  distance: number; // metres from the office point
};

/** straight-line distance between two points, in metres (haversine) */
export const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/** current position, with readable errors */
export const getCurrentFix = (): Promise<LocationFix> =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      return reject(new Error("This device can't share its location."));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          distance: Math.round(distanceMeters(latitude, longitude, OFFICE.lat, OFFICE.lng)),
        });
      },
      (e) =>
        reject(
          new Error(
            e.code === e.PERMISSION_DENIED
              ? "Location is blocked. Allow location access for this site in your browser settings, then try again."
              : e.code === e.TIMEOUT
              ? "Could not get your location in time. Try again."
              : "Could not get your location. Turn on location services and try again."
          )
        ),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });

/** Resolves with the fix when the person is at the office, otherwise throws */
export async function assertAtOffice(): Promise<LocationFix> {
  const fix = await getCurrentFix();
  if (fix.accuracy > OFFICE.maxAccuracyMeters) {
    throw new Error(
      `Your location is not accurate enough (±${fix.accuracy} m). Turn on GPS or Wi-Fi and try again.`
    );
  }
  if (fix.distance > OFFICE.radiusMeters) {
    throw new Error(
      `You are about ${fix.distance} m from the office. You can mark attendance only within ${OFFICE.radiusMeters} m of ${OFFICE.name}.`
    );
  }
  return fix;
}

/** the fields saved on the attendance record */
export const locationFields = (fix: LocationFix) => ({
  lat: fix.lat,
  lng: fix.lng,
  accuracy: fix.accuracy,
  distance: fix.distance,
});


/**
 * Office geofence. Attendance can only be marked inside this circle.
 *
 * PRODUCTION office: M.RATNA, Signh Rd, Nadakkave, Kozhikode 673011
 *   Plus Code 7QCG+XP, 11°16'20.7"N 75°46'36.7"E
 * DEV location (only while building): Pannikkottur
 *   Plus Code 9VXC+73C, 11°23'53.5"N 75°52'12.5"E
 *
 * `npm run dev` uses the DEV location. A production build uses the office.
 * To test the office location while developing, set USE_OFFICE_IN_DEV to true.
 */





// const USE_OFFICE_IN_DEV = false;

// const PRODUCTION = {
//   name: "Office, Nadakkave",
//   lat: 11.2724167,
//   lng: 75.7768611,
//   /** allowed distance from the office point, in metres */
//   radiusMeters: 1000,
//   /** reject GPS readings less accurate than this (phones ~50 m, laptops 50-500 m) */
//   maxAccuracyMeters: 500,

// // name: "Dev location, Pannikkottur",
// //   lat: 11.3981944,
// //   lng: 75.8701389,
// //   radiusMeters: 2000,
// //   maxAccuracyMeters: 5000,
// };

// const DEV = {
//   name: "Dev location, Pannikkottur",
//   lat: 11.3981944,
//   lng: 75.8701389,
//   radiusMeters: 2000,
//   maxAccuracyMeters: 5000,
// };

// export const OFFICE =
//   import.meta.env.DEV && !USE_OFFICE_IN_DEV ? DEV : PRODUCTION;

// export type LocationFix = {
//   lat: number;
//   lng: number;
//   accuracy: number; // metres
//   distance: number; // metres from the office point
// };

// /** straight-line distance between two points, in metres (haversine) */
// export const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
//   const R = 6_371_000;
//   const rad = (d: number) => (d * Math.PI) / 180;
//   const dLat = rad(lat2 - lat1);
//   const dLng = rad(lng2 - lng1);
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
//   return 2 * R * Math.asin(Math.sqrt(a));
// };

// /** current position, with readable errors */
// export const getCurrentFix = (): Promise<LocationFix> =>
//   new Promise((resolve, reject) => {
//     if (!("geolocation" in navigator)) {
//       return reject(new Error("This device can't share its location."));
//     }
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         const { latitude, longitude, accuracy } = pos.coords;
//         resolve({
//           lat: latitude,
//           lng: longitude,
//           accuracy: Math.round(accuracy),
//           distance: Math.round(distanceMeters(latitude, longitude, OFFICE.lat, OFFICE.lng)),
//         });
//       },
//       (e) =>
//         reject(
//           new Error(
//             e.code === e.PERMISSION_DENIED
//               ? "Location is blocked. Allow location access for this site in your browser settings, then try again."
//               : e.code === e.TIMEOUT
//               ? "Could not get your location in time. Try again."
//               : "Could not get your location. Turn on location services and try again."
//           )
//         ),
//       { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
//     );
//   });

// /** Resolves with the fix when the person is at the office, otherwise throws */
// export async function assertAtOffice(): Promise<LocationFix> {
//   const fix = await getCurrentFix();
//   if (fix.accuracy > OFFICE.maxAccuracyMeters) {
//     throw new Error(
//       `Your location is not accurate enough (±${fix.accuracy} m). Turn on GPS or Wi-Fi and try again.`
//     );
//   }
//   if (fix.distance > OFFICE.radiusMeters) {
//     throw new Error(
//       `You are about ${fix.distance} m from the office. You can mark attendance only within ${OFFICE.radiusMeters} m of ${OFFICE.name}.`
//     );
//   }
//   return fix;
// }

// /** the fields saved on the attendance record */
// export const locationFields = (fix: LocationFix) => ({
//   lat: fix.lat,
//   lng: fix.lng,
//   accuracy: fix.accuracy,
//   distance: fix.distance,
// });