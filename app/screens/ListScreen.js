// screens/ListScreen.js
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { supabase } from "../lib/supabase";

export default function ListScreen() {
    const [items, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("items")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
        if (!error) setPosts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
    }, []);

    if (loading) return <Text>Loading…</Text>;
    if (!posts.length) return <Text>No posts yet</Text>;

    return (
        <FlatList
        data={posts}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <Text>{item.title}</Text>
            <Text>{item.type}  {new Date(item.created_at).toLocaleString()}</Text>
            {!!item.image_url && (
                <Image source={{ uri: item.image_url }} style={{ width: 120, height: 120, marginTop: 8 }} />
            )}
            </View>
        )}
        />
    );
}