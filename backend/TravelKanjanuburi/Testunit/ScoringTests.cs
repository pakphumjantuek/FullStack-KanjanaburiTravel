using FluentAssertions;
using TravelKanjanuburi.Model.MPlaces;
using TravelKanjanuburi.Services.AutoTrip;
using Xunit;

public class ScoringTests
{
    private static Place MakePlace(
        int? priceRange = null,
        int? avgVisit = 60,
        params string[] tags)
    {
        var p = new Place
        {
            PriceRange = priceRange,
            AvgVisitMinutes = avgVisit,
            PlaceTags = new List<PlaceTag>()
        };

        foreach (var t in tags)
        {
            p.PlaceTags.Add(new PlaceTag
            {
                Tag = new Tag { TagName = t }
            });
        }

        return p;
    }

    [Fact]
    public void PreferredTag_ShouldIncreaseUtility()
    {
        var place = MakePlace(tags: new[] { "Nature" });
        var pref = new AutoTripService.AutoTripPreference
        {
            PreferredTagNames = new List<string> { "Nature" },
            RelaxedPace = 0.5,
            BudgetLevel = 0.5
        };

        var baseU = AutoTripScoring.ComputeUtility(1.0, place, pref, travelMinutes: 0);

        baseU.Should().BeGreaterThan(1.0); // ได้ tagBonus อย่างน้อย +0.4
    }

    [Fact]
    public void TravelMinutes_ShouldReduceUtility()
    {
        var place = MakePlace();
        var pref = new AutoTripService.AutoTripPreference();

        var uNear = AutoTripScoring.ComputeUtility(1.0, place, pref, travelMinutes: 0);
        var uFar = AutoTripScoring.ComputeUtility(1.0, place, pref, travelMinutes: 120);

        uFar.Should().BeLessThan(uNear);
    }

    [Fact]
    public void LowBudget_ExpensivePlace_ShouldReduceUtilityMore()
    {
        var expensive = MakePlace(priceRange: 5); // แพง
        var cheapPref = new AutoTripService.AutoTripPreference { BudgetLevel = 0.0 }; // อยากถูก
        var richPref = new AutoTripService.AutoTripPreference { BudgetLevel = 1.0 };  // ไม่แคร์แพง

        var uCheapBudget = AutoTripScoring.ComputeUtility(1.0, expensive, cheapPref, travelMinutes: 0);
        var uRichBudget = AutoTripScoring.ComputeUtility(1.0, expensive, richPref, travelMinutes: 0);

        uCheapBudget.Should().BeLessThan(uRichBudget);
    }

    [Fact]
    public void RelaxedPace_ShouldIncreaseStayMinutes()
    {
        var place = MakePlace(avgVisit: 60);

        var normal = new AutoTripService.AutoTripPreference { RelaxedPace = 0.5 };
        var relaxed = new AutoTripService.AutoTripPreference { RelaxedPace = 0.9 };

        AutoTripScoring.GetStayMinutes(place, relaxed)
            .Should().BeGreaterThan(AutoTripScoring.GetStayMinutes(place, normal));
    }

    [Fact]
    public void WithElderOrKids_ShouldIncreaseStayMinutes()
    {
        var place = MakePlace(avgVisit: 60);

        var noKids = new AutoTripService.AutoTripPreference { WithElderOrKids = false };
        var withKids = new AutoTripService.AutoTripPreference { WithElderOrKids = true };

        AutoTripScoring.GetStayMinutes(place, withKids)
            .Should().BeGreaterThan(AutoTripScoring.GetStayMinutes(place, noKids));
    }
}
