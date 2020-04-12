import cheerio from "cheerio";
import fetch from "node-fetch";
import _ from "lodash";

const COLOR_MAP = {
  "#196127": 4,
  "#239a3b": 3,
  "#7bc96f": 2,
  "#c6e48b": 1,
  "#ebedf0": 0,
};

async function fetchYears(username) {
  const data = await fetch(`https://github.com/${username}`);
  const $ = cheerio.load(await data.text());
  return $(".js-year-link")
    .get()
    .map((a) => {
      const $a = $(a);
      return {
        href: $a.attr("href"),
        text: $a.text().trim(),
      };
    });
}

async function fetchDataForYear(url, year, format) {
  const data = await fetch(`https://github.com${url}`);
  const $ = cheerio.load(await data.text());
  const $days = $("rect.day");
  const contribText = $(".js-yearly-contributions h2")
    .text()
    .trim()
    .match(/^([0-9,]+)\s/);
  let contribCount;
  if (contribText) {
    [contribCount] = contribText;
    contribCount = parseInt(contribCount.replace(/,/g, ""), 10);
  }

  return {
    year,
    total: contribCount || 0,
    range: {
      start: $($days.get(0)).attr("data-date"),
      end: $($days.get($days.length - 1)).attr("data-date"),
    },
    contributions: (() => {
      const parseDay = (day) => {
        const $day = $(day);
        const date = $day
          .attr("data-date")
          .split("-")
          .map((d) => parseInt(d, 10));
        const color = $day.attr("fill");
        const value = {
          date: $day.attr("data-date"),
          count: parseInt($day.attr("data-count"), 10),
          color,
          intensity: COLOR_MAP[color.toLowerCase()] || 0,
        };
        return { date, value };
      };

      if (format !== "nested") {
        return $days.get().map((day) => parseDay(day).value);
      }

      return $days.get().reduce((o, day) => {
        const { date, value } = parseDay(day);
        const [y, m, d] = date;
        if (!o[y]) o[y] = {};
        if (!o[y][m]) o[y][m] = {};
        o[y][m][d] = value;
        return o;
      }, {});
    })(),
  };
}

export async function fetchDataForAllYears(username, format) {
  const years = await fetchYears(username);
  return Promise.all(
    years.map((year) => fetchDataForYear(year.href, year.text, format))
  ).then((resp) => {
    return {
      years: (() => {
        const obj = {};
        const arr = resp.map((year) => {
          const { contributions, ...rest } = year;
          _.setWith(obj, [rest.year], rest, Object);
          return rest;
        });
        return format === "nested" ? obj : arr;
      })(),
      contributions:
        format === "nested"
          ? resp.reduce((acc, curr) => _.merge(acc, curr.contributions))
          : resp
              .reduce((list, curr) => [...list, ...curr.contributions], [])
              .sort((a, b) => {
                if (a.date < b.date) return 1;
                else if (a.date > b.date) return -1;
                return 0;
              }),
    };
  });
}

var getDates = function (startDate, endDate) {
  var dates = [],
    currentDate = startDate,
    addDays = function (days) {
      var date = new Date(this.valueOf());
      date.setDate(date.getDate() + days);
      return date;
    };
  while (currentDate <= endDate) {
    dates.push(`${currentDate.toISOString().substr(0, 10)}`);
    currentDate = addDays.call(currentDate, 1);
  }
  return dates;
};

const gitlabIntencity = [0, 1, 10, 20, 30];

export async function fetchGitlabDataForAllYears(username, format) {
  const data = await fetch(
    `https://gitlab.com/api/v4/users?username=${username}`
  );
  const foundUser = _.first(await data.json());

  if (_.isEmpty(foundUser)) {
    return new Error(`Couldn't find user ${username} on GitLab`);
  }

  const userData = await fetch(
    `https://gitlab.com/api/v4/users/${foundUser.id}`
  );

  const { created_at } = await userData.json();

  const activityData = await fetch(
    `https://gitlab.com/api/v4/users/${username}/events?per_page=100&page=1`
  );

  const totalPages = parseInt(activityData.headers.get("X-Total-Pages"));

  let activities = await activityData.json();

  if (totalPages > 1) {
    const pages = Array.from(Array(totalPages), (_, x) => x);

    const activitiesPages = await Promise.all(
      pages.reduce((acc, page) => {
        if (!page) {
          return acc;
        }

        return [
          ...acc,
          fetch(
            `https://gitlab.com/api/v4/users/${username}/events?per_page=100&page=${
              page + 1
            }`
          ),
        ];
      }, [])
    );

    const loadedActivities = await Promise.all([
      ...activitiesPages.map(async (page) => await page.json()),
    ]);

    activities = [...activities, ..._.flatten(loadedActivities)];
  }

  const creationDate = new Date(created_at);

  const creationYear = creationDate.getFullYear();
  const currentDate = new Date();

  const yearsDiff = currentDate.getFullYear() - creationYear;

  const yearsKeys = [
    creationYear,
    ...Array.from(Array(yearsDiff), (_, x) => x + 1 + creationYear),
  ];

  const years = yearsKeys.reduce((acc, year) => {
    return [
      ...acc,
      {
        year: `${year}`,
        range: { start: `${year}-01-01`, end: `${year}-12-31` },
        total: activities.filter((activity) =>
          activity.created_at.includes(year)
        ).length,
      },
    ];
  }, []);

  creationDate.setMonth(0);
  creationDate.setDate(1);

  const contributions = getDates(creationDate, currentDate).map((date) => {
    const count = activities.filter((activity) =>
      activity.created_at.includes(date)
    ).length;

    const intensity =
      gitlabIntencity.findIndex(
        (range) => ((count - 0) ^ (count - range)) < 0
      ) - 1;

    return { date, count, intensity, color: _.invert(COLOR_MAP)[intensity] };
  });

  return { years: years.reverse(), contributions };
}
