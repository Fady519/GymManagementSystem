namespace GymManagementDAL.Entities.Enums
{
    /// <summary>How the money was paid at the reception.</summary>
    public enum PaymentMethod
    {
        Cash = 0,
        Card = 1,
        InstaPay = 2,
        Online = 3
    }

    /// <summary>Why the money moved. Refunds are stored as positive amounts and subtracted in reports.</summary>
    public enum PaymentType
    {
        Purchase = 0,
        Renewal = 1,
        Refund = 2
    }
}
