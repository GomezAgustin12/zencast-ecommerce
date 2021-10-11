const { getId } = require('../lib/common');
const { ReviewsRepo } = require('../repositories');

const reviewsCtrl = {
	delete: async (req, res) => {
		const review = await ReviewsRepo.findOne({ _id: getId(req.body.reviewId) });
		if (!review) {
			res.status(400).json({ message: 'Failed to delete product review' });
			return;
		}

		try {
			// Delete the review
			await ReviewsRepo.delete(review._id);
			res.status(200).json({ message: 'Successfully deleted review' });
		} catch (ex) {
			res.status(400).json({ message: 'Failed to delete review. Please try again' });
		}
	},
};

module.exports = reviewsCtrl;
