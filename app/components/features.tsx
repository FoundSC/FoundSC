import React from "react"
import { View, Text, StyleSheet, FlatList } from "react-native"

const features = [
	{
		key: "smart-search",
		icon: "🔍",
		title: "Smart Search",
		description:
			"Advanced filtering and search capabilities to quickly find what you're looking for.",
	},
	{
		key: "location-based",
		icon: "📍",
		title: "Location-Based",
		description: "Discover found items near you with intelligent proximity matching.",
	},
	{
		key: "instant-alerts",
		icon: "🔔",
		title: "Instant Alerts",
		description: "Get notified immediately when a matching item is reported found.",
	},
	{
		key: "secure-private",
		icon: "🛡️",
		title: "Secure & Private",
		description: "Your information stays protected with verified users and secure messaging.",
	},
]

export function Features() {
	return (
		<View style={styles.section}>
			<View style={styles.header}>
				<Text style={styles.heading}>Everything you need to reconnect</Text>
				<Text style={styles.subhead}>
					Powerful features designed to make finding and returning lost items
					effortless.
				</Text>
			</View>

			<FlatList
				data={features}
				numColumns={2}
				columnWrapperStyle={styles.row}
				keyExtractor={(item) => item.key}
				renderItem={({ item }) => (
					<View style={styles.card}>
						<View style={styles.iconWrap}>
							<Text style={styles.icon}>{item.icon}</Text>
						</View>
						<Text style={styles.cardTitle}>{item.title}</Text>
						<Text style={styles.cardText}>{item.description}</Text>
					</View>
				)}
				contentContainerStyle={styles.list}
				scrollEnabled={false}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	section: { paddingVertical: 20, paddingHorizontal: 16 },
	header: { marginBottom: 12, alignItems: "center" },
	heading: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 6,
	},
	subhead: { fontSize: 14, color: "#555", textAlign: "center" },

	list: { paddingTop: 8 },
	row: { justifyContent: "space-between", marginBottom: 12 },

	card: {
		flex: 1,
		minWidth: "48%",
		backgroundColor: "#fff",
		borderRadius: 10,
		padding: 12,
		marginHorizontal: 4,
		shadowColor: "#000",
		shadowOpacity: 0.06,
		shadowRadius: 6,
		elevation: 2,
	},
	iconWrap: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: "#eef6f6",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	icon: { fontSize: 20 },
	cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
	cardText: { fontSize: 13, color: "#555", lineHeight: 18 },
})
