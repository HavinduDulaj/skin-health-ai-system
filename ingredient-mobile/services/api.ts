import axios from "axios";

const API_URL = "http://192.168.1.124:5003/api/recommendations";

export const getRecommendation = async (
  condition: string,
  riskLevel: string
) => {
  const response = await axios.post(API_URL, {
    condition,
    riskLevel,
  });

  return response.data;
};