import {
  fetchDataForAllYears,
  fetchGitlabDataForAllYears,
} from "../../../utils/api/fetch";

export default async (req, res) => {
  const { username, format } = req.query;
  const data = await fetchGitlabDataForAllYears(username, format);
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.json(data);
};
