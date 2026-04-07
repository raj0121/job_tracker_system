import { City, Country, State } from "country-state-city";

export const getCountryOptions = () => Country.getAllCountries();

export const getStateOptions = (countryCode) => (
  countryCode ? State.getStatesOfCountry(countryCode) : []
);

export const getCityOptions = (countryCode, stateCode) => (
  countryCode && stateCode ? City.getCitiesOfState(countryCode, stateCode) : []
);

export const getNestedStateOptions = (locationMap, country) => (
  country ? Object.keys(locationMap[country] || {}) : []
);

export const getNestedCityOptions = (locationMap, country, state) => (
  country && state ? locationMap[country]?.[state] || [] : []
);

export const applyLocationDependency = (previousValue, name, value) => {
  if (name === "country") {
    return {
      ...previousValue,
      country: value,
      state: "",
      city: ""
    };
  }

  if (name === "state") {
    return {
      ...previousValue,
      state: value,
      city: ""
    };
  }

  return {
    ...previousValue,
    [name]: value
  };
};

export const formatLocationLabel = (...parts) => (
  parts.filter(Boolean).join(", ") || "-"
);
