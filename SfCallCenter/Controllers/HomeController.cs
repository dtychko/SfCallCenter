using System.Web.Mvc;

namespace SfCallCenter.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Auth(string login, string password)
        {
            object result;

            if (login == null || password == null)
            {
                result = new
                    {
                        errorStatus = 1,
                        errorMessage = "Invalid login or password"
                    };
            }
            else if (login.ToLower() == "1061" && password.ToLower() == "qwerty")
            {
                result = new
                    {
                        errorStatus = 0,
                        realm = "000.000.000.000",
                        password = "password",
                        extension = "1061",
                        callerid = "1061",
                        websocket_url = "wss://000.000.000.000:8089/ws",
                        enable_rtcweb_breaker = true
                    };
            }
            else if (login.ToLower() == "1062" && password.ToLower() == "qwerty")
            {
                result = new
                    {
                        errorStatus = 0,
                        realm = "000.000.000.000",
                        password = "password",
                        extension = "1062",
                        callerid = "1062",
                        websocket_url = "ws://000.000.000.000:8088/ws",
                        enable_rtcweb_breaker = true
                    };
            }
            else if (login.ToLower() == "1063" && password.ToLower() == "qwerty")
            {
                result = new
                    {
                        errorStatus = 0,
                        realm = "000.000.000.000",
                        password = "password",
                        extension = "1063",
                        callerid = "1063",
                        websocket_url = "ws://000.000.000.000:8088/ws",
                        enable_rtcweb_breaker = true
                    };
            }
            else
            {
                result = new
                    {
                        errorStatus = 1,
                        errorMessage = "Invalid login or password"
                    };
            }

            return Json(result);
        }
    }
}
