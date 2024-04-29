import API_key from "./API_key.js";

const locationUrl = "http://api.openweathermap.org/geo/1.0/direct";
const weatherUrl = "https://api.openweathermap.org/data/2.5/weather";
const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast";

const differenceKelvin = 273.15;

const searchWrapper = document.querySelector(".search");
const searchElement = document.querySelector(".search__input");
searchElement.addEventListener("change", (event) => {
  const city = new TargetedCity(event.target.value);
  city.getData();
});
const eraseMark = document.querySelector(".search__erase");

const mainContainer = document.querySelector(".main");
const messageElement = document.querySelector(".selected");

class TargetedCity {
  constructor(name) {
    this.name = name;
    this.forecastsData = [];
  }

  async getCityData() {
    const responseCityData = await fetch(
      `${locationUrl}?q=${this.name}&limit=1&appid=${API_key}`
    );
    const cityData = await responseCityData.json();
    this.processCityData(cityData);
  }

  processCityData(cityData) {
    this.lat = cityData[0].lat.toFixed(2);
    this.lon = cityData[0].lon.toFixed(2);
    this.countryName = new Intl.DisplayNames(["en"], { type: "region" }).of(
      cityData[0].country
    );
    this.cityName = cityData[0].local_names.en;
    this.localNames = cityData[0].local_names;
  }

  async getWeather() {
    const responseWeather = await fetch(
      `${weatherUrl}?lat=${this.lat}&lon=${this.lon}&appid=${API_key}`
    );
    const weather = await responseWeather.json();
    this.processWeatherData(weather);
  }

  processWeatherData(weather) {
    const temp = Math.round(weather.main.temp - differenceKelvin);
    const tempFeels = Math.round(weather.main.feels_like - differenceKelvin);
    const weatherIcon = weather.weather[0].icon;
    const weatherDescription = transformToUppercase(
      weather.weather[0].description
    );

    this.current = new CurrentWeatherBar(
      temp,
      tempFeels,
      weatherIcon,
      weatherDescription,
      this.cityName,
      this.countryName
    );
  }

  async getForecast() {
    const responseForecast = await fetch(
      `${forecastUrl}?lat=${this.lat}&lon=${this.lon}&appid=${API_key}`
    );
    const forecast = await responseForecast.json();
    this.processForecastData(forecast);
  }

  processForecastData(forecast) {
    const day = 86400000;
    const firstTimestamp = forecast.list[0].dt * 1000;

    const nextDayNoonTimestamp =
      firstTimestamp + day * 1.5 - (firstTimestamp % day);

    const noonsArray = forecast.list.filter((hourlyReport) => {
      const timestamp = hourlyReport.dt * 1000;
      const isNoon = timestamp % day === day / 2;

      return timestamp >= nextDayNoonTimestamp && isNoon;
    });

    const midnightsArray = forecast.list.filter((hourlyReport) => {
      const timestamp = hourlyReport.dt * 1000;
      const isMidnight = timestamp % day === 0;

      return timestamp >= nextDayNoonTimestamp && isMidnight;
    });

    for (let i = 0; i < 4; i++) {
      const dayTemp = Math.round(noonsArray[i].main.temp - differenceKelvin);
      const nightTemp = Math.round(
        midnightsArray[i].main.temp - differenceKelvin
      );
      const weatherIcon = noonsArray[i].weather[0].icon;
      const weatherDescription = transformToUppercase(
        noonsArray[i].weather[0].description
      );
      const day = new Date(noonsArray[i].dt * 1000).getDay();
      this.forecastsData.push(
        new ForecastBar(
          dayTemp,
          nightTemp,
          weatherIcon,
          weatherDescription,
          day
        )
      );
    }
  }

  render() {
    eraseEverything();
    renderCurrent(this.current);
    renderForecast(this.forecastsData);
    renderSelectedCity(this.localNames, this.cityName, this.countryName);
  }

  async getData() {
    await this.getCityData();
    await this.getWeather();
    await this.getForecast();
    this.render();
  }
}

class CurrentWeatherBar {
  constructor(temp, tempFeels, weatherIcon, weatherDescription, city, country) {
    this.temp = temp;
    this.tempFeels = tempFeels;
    this.weatherIcon = weatherIcon;
    this.weatherDescription = weatherDescription;
    this.city = city;
    this.country = country;
  }
}

class ForecastBar {
  constructor(dayTemp, nightTemp, weatherIcon, weatherDescription, day) {
    this.dayTemp = dayTemp;
    this.nightTemp = nightTemp;
    this.weatherIcon = weatherIcon;
    this.weatherDescription = weatherDescription;
    this.day = day;
  }
}

function defineDay(dayCode) {
  switch (dayCode) {
    case 0:
      return "SUN";
    case 1:
      return "MON";
    case 2:
      return "TUE";
    case 3:
      return "WED";
    case 4:
      return "THU";
    case 5:
      return "FRI";
    case 6:
      return "SAT";
  }
}

function defineUserLanguageName(localNamesArr) {
  const userLanguageCode =
    navigator.languages && navigator.languages.length
      ? navigator.languages[0]
      : navigator.language;

  const langCodeTruncated = userLanguageCode.slice(0, 2);

  if (langCodeTruncated === "en" || !localNamesArr[langCodeTruncated])
    return "";

  return localNamesArr[langCodeTruncated] + ", ";
}

function renderCurrent(currentData) {
  const currentWeatherElement = document.createElement("article");
  currentWeatherElement.className = "current";

  const tempContainer = document.createElement("aside");
  tempContainer.className = "current__temp-container";

  const realTempElement = document.createElement("p");
  realTempElement.innerHTML = `${currentData.temp}&deg;C`;
  realTempElement.className = "current__temp";
  tempContainer.appendChild(realTempElement);

  const feelsTempElement = document.createElement("p");
  feelsTempElement.innerHTML = `Feels like: ${currentData.tempFeels}&deg;C`;
  feelsTempElement.className = "current__feels";
  tempContainer.appendChild(feelsTempElement);

  currentWeatherElement.appendChild(tempContainer);

  const infoContainer = document.createElement("div");
  infoContainer.className = "current__info";

  const weatherDescriptionElement = document.createElement("p");
  weatherDescriptionElement.innerHTML = currentData.weatherDescription;
  infoContainer.appendChild(weatherDescriptionElement);

  const locationElement = document.createElement("p");
  locationElement.innerHTML = `${currentData.city}, ${currentData.country}`;
  infoContainer.className = "current__location";
  infoContainer.appendChild(locationElement);

  currentWeatherElement.appendChild(infoContainer);

  const iconElement = document.createElement("img");
  iconElement.src = `https://openweathermap.org/img/wn/${currentData.weatherIcon}@2x.png`;
  currentWeatherElement.appendChild(iconElement);

  mainContainer.appendChild(currentWeatherElement);
}

function renderForecast(forecastData) {
  const forecastContainer = document.createElement("ul");
  forecastContainer.className = "forecast";

  forecastData.forEach((dayObject) => {
    const forecastElement = document.createElement("li");
    forecastElement.className = "forecast__item";

    const dayElement = document.createElement("p");
    dayElement.innerHTML = defineDay(dayObject.day);
    forecastElement.appendChild(dayElement);

    const iconElement = document.createElement("img");
    iconElement.src = `https://openweathermap.org/img/wn/${dayObject.weatherIcon}@2x.png`;
    forecastElement.appendChild(iconElement);

    const weatherElement = document.createElement("p");
    weatherElement.innerHTML = dayObject.weatherDescription;
    forecastElement.appendChild(weatherElement);

    const tempContainer = document.createElement("aside");

    const daySign = document.createElement("p");
    daySign.innerHTML = "Day";
    tempContainer.appendChild(daySign);

    const dayTempElement = document.createElement("p");
    dayTempElement.className = "forecast__day-temp";
    dayTempElement.innerHTML = `${dayObject.dayTemp} &deg;C`;
    tempContainer.appendChild(dayTempElement);

    const nightTempElement = document.createElement("p");
    nightTempElement.className = "forecast__night-temp";
    nightTempElement.innerHTML = `${dayObject.nightTemp} &deg;C`;
    tempContainer.appendChild(nightTempElement);

    const nightSign = document.createElement("p");
    nightSign.innerHTML = "Night";
    tempContainer.appendChild(nightSign);

    forecastElement.appendChild(tempContainer);

    forecastContainer.appendChild(forecastElement);
  });

  mainContainer.appendChild(forecastContainer);
}

function renderSelectedCity(localNames, cityName, countryName) {
  searchElement.value = `${defineUserLanguageName(
    localNames
  )}${cityName}, ${countryName}`;

  eraseMark.innerHTML = "X";
  searchWrapper.before(eraseMark);

  eraseMark.addEventListener("click", eraseEverything);

  messageElement.innerHTML = `Selected: ${searchElement.value}`;
}

function eraseEverything() {
  searchElement.value = "";
  messageElement.innerHTML = "";
  mainContainer.innerHTML = "";
  eraseMark.innerHTML = "";
}

function transformToUppercase(string) {
  const lowercaseArray = string.split(" ");

  const uppercaseArray = lowercaseArray.map((word) => {
    return word[0].toUpperCase() + word.slice(1);
  });

  return uppercaseArray.join(" ");
}

new TargetedCity("Kyiv").getData();
